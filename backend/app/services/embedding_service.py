"""
embedding_service.py — ML Core for Similar Question Finder
==========================================================

Switch from sentence-transformers (PyTorch, ~450 MB RAM) to fastembed
(ONNX runtime, ~130 MB RAM) to fit Render's free-tier 512 MB limit.

The same all-MiniLM-L6-v2 model is used — fastembed downloads a
pre-quantized ONNX version (~22 MB) instead of the full PyTorch weights.
All public function signatures and return types are identical to the
original; no changes are required in routes or tests.

Design decisions (unchanged from original):

1. WHY cosine similarity over Euclidean distance?
   Cosine similarity measures the *angle* between two vectors — it captures
   semantic direction regardless of vector magnitude. Euclidean distance
   measures absolute spatial distance, which can be misleading when vectors
   differ in length. Since the model encodes semantic meaning in the
   *direction* of embeddings (and we normalize them), cosine similarity is
   the natural and correct choice.

2. WHY load the model ONCE at module import time?
   Loading the ONNX model takes < 1 second. Doing this per-request would
   add unnecessary latency. Loading once at startup means all requests share
   the same in-memory model — zero reload cost. The model is stateless after
   initialisation, so it is safe to call concurrently.

3. WHY a similarity threshold (0.55)?
   Without a threshold, even a low-similarity pair (score ~0.40) would appear
   in results and confuse students. A threshold of 0.55 keeps only matches
   that are genuinely semantically close, eliminating false positives.

4. WHY is assign_topic_tag real zero-shot classification (not keyword matching)?
   We embed a *rich descriptive phrase* for each topic using the same neural
   model, then find which topic embedding is most similar to the question
   embedding. The model has never seen an explicit "Biology" → [keywords] rule.
   It generalises based on co-occurrence patterns learned during pre-training.
"""

from fastembed import TextEmbedding
import numpy as np
from typing import List, Dict, Any

# ---------------------------------------------------------------------------
# Model initialisation — happens ONCE when this module is first imported.
# fastembed downloads the quantized ONNX model (~22 MB) on first run and
# caches it in ~/.cache/fastembed.  Subsequent starts load from disk in < 1s.
# ---------------------------------------------------------------------------
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model = TextEmbedding(model_name=MODEL_NAME)

# ---------------------------------------------------------------------------
# Topic definitions — richer phrases give the model more context for
# zero-shot tagging.  The description is embedded once at startup.
# ---------------------------------------------------------------------------
TOPIC_DESCRIPTIONS: Dict[str, str] = {
    "Biology": (
        "Biology: living organisms, cells, genetics, DNA, evolution, "
        "photosynthesis, ecosystems, anatomy, physiology, microbiology"
    ),
    "Physics": (
        "Physics: mechanics, forces, energy, thermodynamics, electromagnetism, "
        "waves, optics, quantum mechanics, relativity, motion"
    ),
    "Chemistry": (
        "Chemistry: atoms, molecules, chemical reactions, periodic table, "
        "acids, bases, organic chemistry, bonding, stoichiometry"
    ),
    "Mathematics": (
        "Mathematics: algebra, calculus, geometry, trigonometry, statistics, "
        "probability, number theory, equations, proofs, functions"
    ),
    "Computer Science": (
        "Computer Science: programming, algorithms, data structures, "
        "software engineering, databases, networks, operating systems, "
        "machine learning, artificial intelligence"
    ),
    "History": (
        "History: historical events, civilisations, wars, empires, revolutions, "
        "ancient history, world history, timelines, culture, politics"
    ),
    "English": (
        "English: literature, grammar, writing, poetry, novels, reading "
        "comprehension, essays, language, communication, vocabulary"
    ),
}

# Pre-compute topic embeddings once at startup — reused for every tagging call.
# fastembed.embed() returns a generator of numpy arrays (already L2-normalised).
_topic_names: List[str] = list(TOPIC_DESCRIPTIONS.keys())
_topic_embeddings: np.ndarray = np.array(
    list(_model.embed(list(TOPIC_DESCRIPTIONS.values())))
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def embed_text(text: str) -> List[float]:
    """
    Embed a single string and return a normalised unit-vector as a Python list.

    fastembed returns L2-normalised embeddings by default, so cosine similarity
    is equivalent to a dot product — fast and numerically stable.
    """
    vectors = list(_model.embed([text]))
    return vectors[0].tolist()


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Cosine similarity between two pre-normalised embedding vectors.

    Because both vectors are already unit-length (norm = 1), the cosine
    similarity equals their dot product — no division needed.
    Returns a float in [-1, 1]; for sentence embeddings typically [0, 1].
    """
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    return float(np.dot(a, b))


def find_similar_questions(
    new_embedding: List[float],
    past_questions: List[Dict[str, Any]],
    top_k: int = 5,
    threshold: float = 0.55,
) -> List[Dict[str, Any]]:
    """
    Find the top-k most similar past questions to *new_embedding*.

    Parameters
    ----------
    new_embedding   : embedding of the newly submitted question
    past_questions  : list of MongoDB question documents; each must have
                      an "embedding" field (list of floats) and at minimum
                      "_id", "text", and "tag" fields.
    top_k           : maximum number of results to return
    threshold       : minimum cosine similarity to count as a match.
                      Prevents false-positive matches on generic questions.

    Returns an empty list if past_questions is empty — handles cold-start
    gracefully without raising an exception.
    """
    if not past_questions:
        return []

    results = []
    for q in past_questions:
        score = cosine_similarity(new_embedding, q["embedding"])
        if score >= threshold:
            results.append({
                "question_id": str(q["_id"]),
                "text": q["text"],
                "tag": q.get("tag", ""),
                "similarity": round(score, 4),
            })

    # Sort by similarity descending, take top_k
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:top_k]


def assign_topic_tag(new_embedding: List[float]) -> Dict[str, Any]:
    """
    Zero-shot topic classification via embedding cosine similarity.

    Compares *new_embedding* against each pre-computed topic embedding
    and returns the best-matching topic name plus its confidence score.

    This is genuine zero-shot classification: no if/else, no keyword list —
    the model's internal representation determines the closest topic purely
    from semantic meaning.
    """
    vec = np.array(new_embedding, dtype=np.float32)
    # Dot product with all topic vectors at once (vectorised, fast)
    scores: np.ndarray = _topic_embeddings @ vec          # shape: (n_topics,)
    best_idx: int = int(np.argmax(scores))
    return {
        "tag": _topic_names[best_idx],
        "confidence": round(float(scores[best_idx]), 4),
    }
