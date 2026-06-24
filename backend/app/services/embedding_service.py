"""
embedding_service.py — ML Core for Similar Question Finder
==========================================================

Uses fastembed (ONNX runtime, ~130 MB RAM) for Render free-tier compatibility.
The same all-MiniLM-L6-v2 model is used via a pre-quantized ONNX file.

Design decisions:

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

3. WHY a similarity threshold (0.55) for question matching?
   Without a threshold, even a low-similarity pair (score ~0.40) would appear
   in results and confuse students. A threshold of 0.55 keeps only matches
   that are genuinely semantically close, eliminating false positives.

4. WHY a confidence threshold (0.45) for topic tagging?
   Generic or ambiguous questions (e.g. "What is this?", "Why?") tend to
   cluster near the centre of embedding space and can match any topic at
   ~0.35-0.44 similarity. Forcing a topic label onto a low-confidence
   question is worse than admitting uncertainty — so we return "Other"
   when no topic exceeds 0.45. This prevents incorrect tagging.

5. WHY is assign_topic_tag real zero-shot classification (not keyword matching)?
   We embed a *rich descriptive phrase* for each topic using the same neural
   model, then find which topic embedding is most similar to the question
   embedding. The model has never seen an explicit "Biology" → [keywords] rule.
   It generalises based on co-occurrence patterns learned during pre-training.

6. WHY is "Other" not given its own embedding?
   "Other" is a residual category, not a semantic concept. Giving it an
   embedding would make it compete with real subjects and potentially absorb
   legitimate questions. Instead, "Other" is assigned purely by threshold —
   if the best subject score < CONFIDENCE_THRESHOLD, the question is
   too ambiguous to classify and is labelled "Other".
"""

from fastembed import TextEmbedding
import numpy as np
from typing import List, Dict, Any

# ---------------------------------------------------------------------------
# Model initialisation — happens ONCE when this module is first imported.
# fastembed downloads the quantized ONNX model (~22 MB) on first run and
# caches it in ~/.cache/fastembed. Subsequent starts load from disk in < 1s.
# ---------------------------------------------------------------------------
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model = TextEmbedding(model_name=MODEL_NAME)

# ---------------------------------------------------------------------------
# Confidence threshold for topic tagging.
# If the highest subject similarity score is below this value, the question
# is too ambiguous to classify and is assigned the "Other" tag instead.
#
# NOTE: all-MiniLM-L6-v2 via fastembed produces cosine similarities in the
# 0.15–0.40 range for cross-domain topic classification. A threshold of 0.45
# was too aggressive and classified everything as "Other". 0.28 retains the
# safety net for genuinely meaningless text while allowing real questions through.
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD: float = 0.28

# ---------------------------------------------------------------------------
# Topic definitions — richer phrases give the model more context for
# zero-shot tagging. The description is embedded once at startup and
# cached. "Other" is intentionally excluded — it is a threshold fallback,
# not a semantic concept.
# ---------------------------------------------------------------------------
TOPIC_DESCRIPTIONS: Dict[str, str] = {
    "Biology": (
        "Biology: living organisms, cells, genetics, DNA, evolution, "
        "photosynthesis, ecosystems, anatomy, physiology, microbiology, "
        "biodiversity, reproduction, metabolism, classification of life"
    ),
    "Physics": (
        "Physics: mechanics, forces, energy, thermodynamics, electromagnetism, "
        "waves, optics, quantum mechanics, relativity, motion, gravity, "
        "nuclear physics, particle physics, circuits, magnetism, "
        "orbital mechanics, planetary motion, Earth's rotation, "
        "gravitational force, celestial mechanics, astronomy, solar system, "
        "Newton's laws, acceleration, velocity, momentum, friction"
    ),
    "Chemistry": (
        "Chemistry: atoms, molecules, chemical reactions, periodic table, "
        "acids, bases, organic chemistry, bonding, stoichiometry, "
        "electrochemistry, thermochemistry, polymers, laboratory techniques"
    ),
    "Mathematics": (
        "Mathematics: algebra, calculus, geometry, trigonometry, statistics, "
        "probability, number theory, equations, proofs, functions, "
        "matrices, vectors, sequences, integration, differentiation"
    ),
    "Computer Science": (
        "Computer Science: programming, algorithms, data structures, "
        "software engineering, databases, networks, operating systems, "
        "machine learning, artificial intelligence, cybersecurity, "
        "web development, compilers, recursion, binary, sorting"
    ),
    "History": (
        "History: historical events, civilisations, wars, empires, revolutions, "
        "ancient history, world history, timelines, culture, politics, "
        "dynasties, colonialism, world wars, medieval, renaissance"
    ),
    "English": (
        "English: literature, grammar, writing, poetry, novels, reading "
        "comprehension, essays, language, communication, vocabulary, "
        "punctuation, metaphor, narrative, Shakespeare, prose, rhetoric"
    ),
    "Geography": (
        "Geography: countries, capitals, continents, oceans, mountains, rivers, "
        "climate zones, maps, latitude, longitude, natural resources, "
        "population, urbanisation, tectonic plates, weather patterns, "
        "migration, landforms, physical geography, human geography, "
        "seasons, Earth's orbit, axial tilt, solar radiation, atmosphere, "
        "Earth science, hemisphere, tropical, polar, temperate zones, "
        "day length, monsoon, rainfall, erosion, volcanoes, earthquakes, "
        "biomes, deserts, rainforests, glaciers, sea level, ocean currents"
    ),
    "Economics": (
        "Economics: supply, demand, market, inflation, GDP, trade, fiscal policy, "
        "monetary policy, microeconomics, macroeconomics, opportunity cost, "
        "elasticity, competition, monopoly, taxation, interest rates, "
        "recession, investment, budget, international trade, currency"
    ),
    "Environmental Science": (
        "Environmental Science: climate change, global warming, pollution, "
        "sustainability, renewable energy, carbon emissions, deforestation, "
        "conservation, recycling, greenhouse gases, ozone layer, "
        "biodiversity loss, ecology, natural disasters, water cycle, "
        "fossil fuels, solar energy, environmental policy"
    ),
    "General Knowledge": (
        "General knowledge: trivia, facts, current events, world records, "
        "famous people, sports, entertainment, arts, culture, inventions, "
        "discoveries, awards, geography facts, science facts, history facts, "
        "miscellaneous, everyday life, general awareness, quiz"
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
    Confidence-threshold topic classification via embedding cosine similarity.

    Compares *new_embedding* against each pre-computed topic embedding and
    returns the best-matching topic name plus its raw confidence score.

    Confidence threshold (CONFIDENCE_THRESHOLD = 0.45):
    ────────────────────────────────────────────────────
    If the highest similarity score across all subjects is below the threshold,
    the topic is set to "Other" — meaning the question is too ambiguous or
    general for confident subject classification. The confidence score returned
    is still the raw best score so the frontend can show e.g. "Other (34%)".

    This prevents incorrect forced tagging on generic questions like
    "What is this?" or "Why does it happen?".
    """
    vec = np.array(new_embedding, dtype=np.float32)
    # Vectorised dot product against all topic embeddings — O(n_topics * dim)
    scores: np.ndarray = _topic_embeddings @ vec          # shape: (n_topics,)
    best_idx: int = int(np.argmax(scores))
    best_score: float = round(float(scores[best_idx]), 4)

    # Apply confidence threshold — fall back to "Other" if too uncertain
    if best_score < CONFIDENCE_THRESHOLD:
        tag = "Other"
    else:
        tag = _topic_names[best_idx]

    return {
        "tag": tag,
        "confidence": best_score,   # raw best score regardless of "Other" fallback
    }
