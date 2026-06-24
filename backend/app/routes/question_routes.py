"""
question_routes.py — POST /questions and GET /questions

Suggested Answer design:
  - The embedding pipeline (fastembed / ONNX) is untouched.
  - After the standard similarity search, if the top match >= 0.70 we do a
    single targeted _id lookup to retrieve its stored `answer` field.
  - This is one indexed MongoDB query (< 1ms) — no new ML model, no memory hit.
  - The answer is also persisted in the new question document so that
    GET /questions can return it without re-querying.
  - Future: replace the simple lookup with an AI-generated answer by swapping
    _get_suggested_answer() — frontend API is unchanged.
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.auth import get_current_user
from app.database import get_db
from app.models import QuestionRequest, QuestionResponse, QuestionListItem, SimilarQuestion
from app.services.embedding_service import embed_text, find_similar_questions, assign_topic_tag

router = APIRouter(prefix="/questions", tags=["questions"])

# Similarity threshold above which we surface a suggested answer
ANSWER_THRESHOLD = 0.70


# ---------------------------------------------------------------------------
# Helper — single _id lookup to retrieve a stored answer
# ---------------------------------------------------------------------------

async def _get_suggested_answer(db, top_similar: list) -> tuple[Optional[str], float]:
    """
    Given the ordered list of similar questions, return the suggested answer
    and best similarity score.

    Returns (answer_text | None, best_similarity_float).

    Design note: keeping this as a standalone async function means a future
    AI answer generator can be dropped in here without touching any other code.
    """
    if not top_similar:
        return None, 0.0

    best = top_similar[0]          # already sorted by similarity desc
    best_sim: float = best["similarity"]

    if best_sim < ANSWER_THRESHOLD:
        return None, best_sim

    # One targeted, index-backed _id lookup — typically < 1ms
    doc = await db.questions.find_one(
        {"_id": ObjectId(best["question_id"])},
        {"answer": 1},
    )
    answer = doc.get("answer") if doc else None
    return answer, best_sim


# ---------------------------------------------------------------------------
# Serialiser
# ---------------------------------------------------------------------------

def _serialize_question(doc: dict) -> QuestionListItem:
    """Convert a MongoDB question document to a QuestionListItem response."""
    return QuestionListItem(
        question_id=str(doc["_id"]),
        text=doc["text"],
        tag=doc["tag"],
        tag_confidence=doc.get("tag_confidence", 0.0),
        similar_count=len(doc.get("similar_questions", [])),
        created_at=doc["created_at"].isoformat(),
        suggested_answer=doc.get("suggested_answer"),      # persisted at submit time
        best_similarity=doc.get("best_similarity", 0.0),
    )


# ---------------------------------------------------------------------------
# POST /questions — submit a new question
# ---------------------------------------------------------------------------

@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def submit_question(
    body: QuestionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Protected endpoint — submit a new study question.

    Pipeline (embedding service is unchanged):
      1. Embed the question text (local ONNX model via fastembed).
      2. Fetch ALL past questions to compute cosine similarity.
      3. Find top-3 similar past questions (threshold = 0.55).
      4. Assign a topic tag via zero-shot embedding comparison.
      5. If top match >= 70%, retrieve the stored answer → suggested_answer.
      6. Save the question, embedding, tag, similar matches, and answer to MongoDB.
      7. Return the enriched response to the frontend.
    """
    db = get_db()
    user_id = current_user["sub"]

    # Step 1 — embed (fastembed ONNX, loaded once at startup)
    embedding = embed_text(body.text)

    # Step 2 — fetch all past questions (embedding field only — kept minimal)
    past_cursor = db.questions.find(
        {},
        {"_id": 1, "text": 1, "tag": 1, "embedding": 1},
    )
    past_questions = await past_cursor.to_list(length=None)

    # Step 3 — find similar (top 3, threshold 0.55)
    similar_raw = find_similar_questions(
        embedding, past_questions, top_k=3, threshold=0.55
    )

    # Step 4 — assign topic tag
    tag_result = assign_topic_tag(embedding)

    # Step 5 — suggested answer (one targeted DB lookup, no new ML model)
    suggested_answer, best_similarity = await _get_suggested_answer(db, similar_raw)

    # Step 6 — save to DB
    now = datetime.now(timezone.utc)
    doc = {
        "user_id":          user_id,
        "text":             body.text,
        "embedding":        embedding,
        "tag":              tag_result["tag"],
        "tag_confidence":   tag_result["confidence"],
        "similar_questions": similar_raw,
        "created_at":       now,
        # Suggested answer persisted so GET /questions doesn't need to re-derive it
        "suggested_answer": suggested_answer,
        "best_similarity":  best_similarity,
        # Optional user-provided answer (for seeding / future admin tools)
        "answer":           body.answer,
    }
    result = await db.questions.insert_one(doc)
    question_id = str(result.inserted_id)

    # Step 7 — build response
    similar_out = [
        SimilarQuestion(
            question_id=s["question_id"],
            text=s["text"],
            tag=s["tag"],
            similarity=s["similarity"],
        )
        for s in similar_raw
    ]

    return QuestionResponse(
        question_id=question_id,
        text=body.text,
        tag=tag_result["tag"],
        tag_confidence=tag_result["confidence"],
        similar_questions=similar_out,
        created_at=now.isoformat(),
        suggested_answer=suggested_answer,
        best_similarity=best_similarity,
    )


# ---------------------------------------------------------------------------
# GET /questions — user history
# ---------------------------------------------------------------------------

@router.get("", response_model=list[QuestionListItem])
async def get_question_history(
    tag: Optional[str] = Query(default=None, description="Filter by topic tag"),
    current_user: dict = Depends(get_current_user),
):
    """
    Protected endpoint — return the logged-in user's question history.
    Optionally filter by ?tag=Biology etc.
    Results are ordered newest-first.
    """
    db = get_db()
    user_id = current_user["sub"]

    query_filter: dict = {"user_id": user_id}
    if tag:
        query_filter["tag"] = tag

    cursor = db.questions.find(
        query_filter,
        {"embedding": 0},               # exclude large embedding array
    ).sort("created_at", -1)

    docs = await cursor.to_list(length=200)
    return [_serialize_question(d) for d in docs]
