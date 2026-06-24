"""
question_routes.py — POST /questions and GET /questions
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


def _serialize_question(doc: dict) -> QuestionListItem:
    """Convert a MongoDB question document to a QuestionListItem response."""
    return QuestionListItem(
        question_id=str(doc["_id"]),
        text=doc["text"],
        tag=doc["tag"],
        tag_confidence=doc.get("tag_confidence", 0.0),
        similar_count=len(doc.get("similar_questions", [])),
        created_at=doc["created_at"].isoformat(),
    )


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def submit_question(
    body: QuestionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Protected endpoint — submit a new study question.

    Pipeline:
      1. Embed the question text (local ML model, no external API).
      2. Fetch ALL previously stored questions to compute cosine similarity.
      3. Find the top-k similar past questions (threshold = 0.55).
      4. Assign a topic tag via zero-shot embedding comparison.
      5. Save the question, embedding, tag, and similar matches to MongoDB.
      6. Return the enriched response to the frontend.
    """
    db = get_db()
    user_id = current_user["sub"]

    # Step 1 — embed
    embedding = embed_text(body.text)

    # Step 2 — fetch all past questions (embedding field included)
    past_cursor = db.questions.find({}, {"_id": 1, "text": 1, "tag": 1, "embedding": 1})
    past_questions = await past_cursor.to_list(length=None)

    # Step 3 — find similar
    similar_raw = find_similar_questions(embedding, past_questions, top_k=5, threshold=0.55)

    # Step 4 — assign tag
    tag_result = assign_topic_tag(embedding)

    # Step 5 — save to DB
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "text": body.text,
        "embedding": embedding,
        "tag": tag_result["tag"],
        "tag_confidence": tag_result["confidence"],
        "similar_questions": similar_raw,
        "created_at": now,
    }
    result = await db.questions.insert_one(doc)
    question_id = str(result.inserted_id)

    # Step 6 — build response
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
    )


@router.get("", response_model=list[QuestionListItem])
async def get_question_history(
    tag: Optional[str] = Query(default=None, description="Filter by topic tag"),
    current_user: dict = Depends(get_current_user),
):
    """
    Protected endpoint — return the logged-in user's question history.
    Optionally filter by ?tag=Biology etc. Results are ordered newest-first.
    """
    db = get_db()
    user_id = current_user["sub"]

    query_filter: dict = {"user_id": user_id}
    if tag:
        query_filter["tag"] = tag

    cursor = db.questions.find(
        query_filter,
        {"embedding": 0},
    ).sort("created_at", -1)

    docs = await cursor.to_list(length=200)
    return [_serialize_question(d) for d in docs]


@router.post("/retag-all", tags=["admin"])
async def retag_all_questions(
    current_user: dict = Depends(get_current_user),
):
    """
    Admin endpoint — re-tag every question in the database using the
    current embedding model and updated topic descriptions.

    Call this ONCE after changing TOPIC_DESCRIPTIONS or CONFIDENCE_THRESHOLD
    to fix historical records that were tagged under the old logic.

    Requires a valid JWT. Returns a summary and new tag distribution.
    """
    db = get_db()

    # Fetch all questions that have a stored embedding
    cursor = db.questions.find(
        {"embedding": {"$exists": True}},
        {"_id": 1, "embedding": 1},
    )
    docs = await cursor.to_list(length=None)

    if not docs:
        return {"updated": 0, "message": "No questions with embeddings found."}

    updated = 0
    tag_counts: dict = {}

    for doc in docs:
        try:
            result = assign_topic_tag(doc["embedding"])
            new_tag = result["tag"]
            new_confidence = result["confidence"]

            await db.questions.update_one(
                {"_id": doc["_id"]},
                {"$set": {
                    "tag": new_tag,
                    "tag_confidence": new_confidence,
                }},
            )
            updated += 1
            tag_counts[new_tag] = tag_counts.get(new_tag, 0) + 1
        except Exception:
            continue  # skip docs with malformed embeddings

    return {
        "updated": updated,
        "total": len(docs),
        "tag_distribution": tag_counts,
        "message": f"Successfully re-tagged {updated} of {len(docs)} questions.",
    }
