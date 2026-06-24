"""
embedding_service.py — ML Core for Similar Question Finder
==========================================================

Uses fastembed (ONNX runtime, ~130 MB RAM) for Render free-tier compatibility.
The same all-MiniLM-L6-v2 model is used via a pre-quantized ONNX file.

Key design decisions:

1. Topic descriptions use REPRESENTATIVE QUESTIONS, not keyword lists.
   The all-MiniLM-L6-v2 model was trained on semantic sentence similarity.
   It scores question-to-question similarity far higher than
   question-to-keyword-list similarity. Using representative questions as
   anchors dramatically improves zero-shot tagging accuracy.

2. CONFIDENCE_THRESHOLD = 0.30
   With question-format anchors, genuine subject questions score 0.40-0.75.
   Truly ambiguous or meaningless input scores below 0.30. This is the
   right operating point for this approach.

3. Model loads ONCE at startup — stateless, safe for concurrent requests.

4. "Other" has no anchor — it is a threshold residual, not a semantic topic.
"""

from fastembed import TextEmbedding
import numpy as np
from typing import List, Dict, Any

# ---------------------------------------------------------------------------
# Model — loaded once at startup, shared across all requests.
# ---------------------------------------------------------------------------
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model = TextEmbedding(model_name=MODEL_NAME)

# ---------------------------------------------------------------------------
# Confidence threshold.
# With question-format topic anchors, genuine questions score 0.40+.
# Values below 0.30 indicate the text is too vague/ambiguous to classify.
# ---------------------------------------------------------------------------
CONFIDENCE_THRESHOLD: float = 0.30

# ---------------------------------------------------------------------------
# Topic anchors — written as REPRESENTATIVE QUESTIONS, not keyword lists.
#
# Rationale: all-MiniLM-L6-v2 was trained to compare sentences to sentences.
# A question like "What causes seasons?" has high similarity to OTHER QUESTIONS
# about seasons/geography — far higher than to a keyword list like
# "Geography: countries, capitals, climate zones...".
#
# Using question-format anchors exploits the model's training distribution
# and yields significantly better zero-shot classification accuracy.
# ---------------------------------------------------------------------------
TOPIC_DESCRIPTIONS: Dict[str, str] = {
    "Biology": (
        "How does photosynthesis work? "
        "What is the role of DNA in heredity? "
        "How do cells divide through mitosis and meiosis? "
        "What is natural selection and evolution? "
        "How does the human digestive system function? "
        "What are the differences between prokaryotes and eukaryotes? "
        "How do ecosystems maintain balance? "
        "What are the functions of different organelles in a cell?"
    ),
    "Physics": (
        "What is Newton's second law of motion? "
        "How does gravity affect objects in free fall? "
        "What is the relationship between force, mass, and acceleration? "
        "How do electric circuits work? "
        "What is the speed of light and how is it measured? "
        "How does thermodynamics explain heat transfer? "
        "What are the principles of quantum mechanics? "
        "How does electromagnetic induction produce electricity? "
        "What is the difference between potential and kinetic energy?"
    ),
    "Chemistry": (
        "How do atoms bond to form molecules? "
        "What happens during a chemical reaction? "
        "How does the periodic table organize elements? "
        "What is the difference between acids and bases? "
        "How does oxidation and reduction occur in redox reactions? "
        "What are the properties of organic compounds? "
        "How is stoichiometry used to balance chemical equations? "
        "What are the states of matter and how do phase changes occur?"
    ),
    "Mathematics": (
        "How do you solve a quadratic equation? "
        "What is the derivative of a function in calculus? "
        "How do you calculate the area of geometric shapes? "
        "What is the Pythagorean theorem? "
        "How does probability work in statistics? "
        "What are vectors and matrices in linear algebra? "
        "How do you find the integral of a function? "
        "What are prime numbers and number theory concepts?"
    ),
    "Computer Science": (
        "How does a sorting algorithm work? "
        "What is the difference between a stack and a queue? "
        "How does recursion work in programming? "
        "What is time complexity and Big-O notation? "
        "How does a relational database store data? "
        "What is machine learning and how do neural networks learn? "
        "How does the internet transmit data using TCP/IP? "
        "What is object-oriented programming?"
    ),
    "History": (
        "What caused the First World War? "
        "How did the Roman Empire fall? "
        "What were the causes and effects of the French Revolution? "
        "How did colonialism shape the modern world? "
        "What events led to the Second World War? "
        "How did ancient civilisations like Egypt develop? "
        "What was the significance of the Renaissance? "
        "How did the Industrial Revolution change society?"
    ),
    "English": (
        "What are the main themes in Shakespeare's Hamlet? "
        "How do you write a persuasive essay? "
        "What is the difference between a metaphor and a simile? "
        "How do you analyse the structure of a poem? "
        "What are the rules of grammar for sentence construction? "
        "How does the author develop characters in a novel? "
        "What is the narrative perspective in a story? "
        "How do you identify the tone and mood of a piece of writing?"
    ),
    "Geography": (
        "What causes the seasons to change on Earth? "
        "Why is Earth divided into different climate zones? "
        "How do tectonic plates cause earthquakes and volcanoes? "
        "What are the major rivers and mountain ranges of the world? "
        "Why do different countries have different weather patterns? "
        "How does the water cycle work? "
        "What is the difference between latitude and longitude? "
        "Why are rainforests found near the equator? "
        "How do ocean currents affect climate? "
        "What causes the formation of deserts?"
    ),
    "Economics": (
        "How does supply and demand determine prices? "
        "What causes inflation and how is it measured? "
        "What is the difference between GDP and economic growth? "
        "How do central banks control monetary policy? "
        "What are the effects of taxation on the economy? "
        "How does international trade benefit countries? "
        "What is opportunity cost in economics? "
        "How do recessions and economic cycles occur?"
    ),
    "Environmental Science": (
        "What causes climate change and global warming? "
        "How does deforestation affect biodiversity? "
        "What are the effects of air and water pollution? "
        "How do renewable energy sources reduce carbon emissions? "
        "What is the greenhouse effect? "
        "How can ecosystems recover from environmental damage? "
        "What is the impact of plastic pollution on ocean life? "
        "How does the ozone layer protect life on Earth?"
    ),
    "General Knowledge": (
        "What is the tallest mountain in the world? "
        "Who invented the telephone? "
        "What is the fastest animal on Earth? "
        "Which country has the largest population? "
        "What are the seven wonders of the modern world? "
        "Who wrote Romeo and Juliet? "
        "What is the capital of Australia? "
        "How many bones are in the human body?"
    ),
}

# Pre-compute topic embeddings once — reused for every tagging call.
_topic_names: List[str] = list(TOPIC_DESCRIPTIONS.keys())
_topic_embeddings: np.ndarray = np.array(
    list(_model.embed(list(TOPIC_DESCRIPTIONS.values())))
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def embed_text(text: str) -> List[float]:
    """Embed a single string; returns L2-normalised unit vector as a list."""
    vectors = list(_model.embed([text]))
    return vectors[0].tolist()


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Cosine similarity between two pre-normalised vectors.
    Equals dot product for unit-length vectors — fast and numerically stable.
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
    Find the top-k most similar past questions to new_embedding.
    Returns [] on cold start (no past questions) — no exception raised.
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

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:top_k]


def assign_topic_tag(new_embedding: List[float]) -> Dict[str, Any]:
    """
    Zero-shot topic classification using question-anchor embeddings.

    Compares new_embedding against pre-computed topic anchor embeddings
    (representative questions per subject) and returns the best topic + score.

    If best_score < CONFIDENCE_THRESHOLD (0.30), returns tag="Other" —
    the question is too ambiguous to classify confidently.
    """
    vec = np.array(new_embedding, dtype=np.float32)
    scores: np.ndarray = _topic_embeddings @ vec       # shape: (n_topics,)
    best_idx: int = int(np.argmax(scores))
    best_score: float = round(float(scores[best_idx]), 4)

    tag = _topic_names[best_idx] if best_score >= CONFIDENCE_THRESHOLD else "Other"

    return {
        "tag": tag,
        "confidence": best_score,
    }
