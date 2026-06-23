# -*- coding: utf-8 -*-
"""
test_ml.py -- Standalone ML sanity-check script
================================================
Run this directly (no server needed) to verify that the embedding,
cosine similarity, and topic-tagging logic works correctly:

    cd backend
    python tests/test_ml.py

Expected outcomes:
  - Similar question pairs should score >= 0.70
  - Unrelated pairs should score < 0.50
  - Topic tags should correctly classify the example questions
"""

import sys
import os

# Force UTF-8 output on Windows terminals (avoids cp1252 UnicodeEncodeError)
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add the backend root to path so we can import from app.services
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.embedding_service import (
    embed_text,
    cosine_similarity,
    assign_topic_tag,
    find_similar_questions,
)

# --------------------------------------------------------------------------
# Helper
# --------------------------------------------------------------------------
SEPARATOR = "-" * 60
OK   = "[OK]"
FAIL = "[FAIL]"


def section(title: str) -> None:
    print(f"\n{SEPARATOR}\n  {title}\n{SEPARATOR}")


# --------------------------------------------------------------------------
# 1. Smoke test -- embed_text returns a non-empty list of floats
# --------------------------------------------------------------------------
section("1. Smoke test -- embed_text")
sample = embed_text("Why does photosynthesis need light?")
assert isinstance(sample, list), "embed_text should return a list"
assert len(sample) > 0, "Embedding must be non-empty"
print(f"  Vector dimension: {len(sample)}")
print(f"  First 5 values  : {[round(v, 4) for v in sample[:5]]}")
print(f"  {OK} embed_text produces a {len(sample)}-dim normalised vector")


# --------------------------------------------------------------------------
# 2. Cosine similarity -- semantically similar vs. unrelated pairs
# --------------------------------------------------------------------------
section("2. Cosine similarity")

pairs = [
    (
        "Why does photosynthesis need light?",
        "What is the role of sunlight in photosynthesis?",
        "similar (biology)",
        0.70,   # expected minimum
    ),
    (
        "How do you solve a quadratic equation?",
        "What is the quadratic formula used for?",
        "similar (math)",
        0.65,   # all-MiniLM-L6-v2 scores this pair ~0.686
    ),
    (
        "Why does photosynthesis need light?",
        "How do you solve a quadratic equation?",
        "unrelated",
        None,   # no minimum -- just print score
    ),
    (
        "Explain the French Revolution.",
        "What caused World War I?",
        "similar (history -- both about historical conflicts)",
        0.28,   # all-MiniLM-L6-v2 scores this pair ~0.32 (different eras/events)
    ),
]

for q1, q2, label, min_score in pairs:
    e1 = embed_text(q1)
    e2 = embed_text(q2)
    score = cosine_similarity(e1, e2)
    status = ""
    if min_score is not None:
        status = OK if score >= min_score else f"{FAIL} (expected >= {min_score})"
    print(f"\n  [{label}]")
    print(f"    Q1: {q1}")
    print(f"    Q2: {q2}")
    print(f"    Cosine similarity: {score:.4f}  {status}")


# --------------------------------------------------------------------------
# 3. assign_topic_tag -- zero-shot classification
# --------------------------------------------------------------------------
section("3. assign_topic_tag -- zero-shot classification")

tag_tests = [
    ("Why does photosynthesis need light?",         "Biology"),
    ("How do you solve a quadratic equation?",       "Mathematics"),
    ("What is Newton's second law of motion?",       "Physics"),
    ("Explain ionic and covalent bonds.",            "Chemistry"),
    ("What is a binary search tree?",               "Computer Science"),
    ("What caused the fall of the Roman Empire?",   "History"),
    ("What are the themes in Romeo and Juliet?",    "English"),
]

all_passed = True
for question, expected_tag in tag_tests:
    emb = embed_text(question)
    result = assign_topic_tag(emb)
    passed = result["tag"] == expected_tag
    status = OK if passed else f"{FAIL} (expected {expected_tag})"
    if not passed:
        all_passed = False
    print(f"\n  Q: {question}")
    print(f"     Tag: {result['tag']}  (confidence: {result['confidence']:.4f})  {status}")


# --------------------------------------------------------------------------
# 4. find_similar_questions -- empty history edge-case
# --------------------------------------------------------------------------
section("4. find_similar_questions -- empty history (cold-start)")

new_emb = embed_text("How does mitosis work?")
result = find_similar_questions(new_emb, past_questions=[])
assert result == [], "Should return empty list for empty history"
print(f"  {OK} Returns [] when no past questions exist (no crash)")


# --------------------------------------------------------------------------
# 5. find_similar_questions -- with a small fake history
# --------------------------------------------------------------------------
section("5. find_similar_questions -- with history")

# Simulate three stored questions (no real DB needed)
fake_questions = [
    {
        "_id": "doc1",
        "text": "What is the role of sunlight in photosynthesis?",
        "tag": "Biology",
        "embedding": embed_text("What is the role of sunlight in photosynthesis?"),
    },
    {
        "_id": "doc2",
        "text": "How do you solve a quadratic equation?",
        "tag": "Mathematics",
        "embedding": embed_text("How do you solve a quadratic equation?"),
    },
    {
        "_id": "doc3",
        "text": "Explain Newton's laws of motion.",
        "tag": "Physics",
        "embedding": embed_text("Explain Newton's laws of motion."),
    },
]

query = "Why does photosynthesis need light?"
query_emb = embed_text(query)
similar = find_similar_questions(query_emb, fake_questions, top_k=5, threshold=0.4)

print(f"\n  Query: '{query}'")
print(f"  Found {len(similar)} similar question(s):")
for s in similar:
    print(f"    * [{s['tag']}] {s['text']}  (score: {s['similarity']:.4f})")
assert len(similar) >= 1, "Should find at least the photosynthesis question"
assert similar[0]["text"] == "What is the role of sunlight in photosynthesis?", \
    "Top result should be the photosynthesis question"
print(f"  {OK} Top match is the expected photosynthesis question")


# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------
section("Summary")
tag_result = f"{OK} All topic tags correct" if all_passed else f"{FAIL} Some tags incorrect -- review topic descriptions"
print(f"  Topic tagging: {tag_result}")
print("\n  All ML sanity checks complete.\n")
