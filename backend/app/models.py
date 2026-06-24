"""
models.py — Pydantic request/response schemas
"""

from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    name: str
    email: str


# ---------------------------------------------------------------------------
# Question schemas
# ---------------------------------------------------------------------------

class QuestionRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=2000)
    # Optional user-provided answer — stored alongside the question so that
    # future similar questions can surface it as a "Suggested Answer".
    # Not shown in the submission UI; available via API for future admin tools.
    answer: Optional[str] = Field(default=None, max_length=5000)


class SimilarQuestion(BaseModel):
    question_id: str
    text: str
    tag: str
    similarity: float


class QuestionResponse(BaseModel):
    question_id: str
    text: str
    tag: str
    tag_confidence: float
    similar_questions: List[SimilarQuestion]
    created_at: str
    # ── Suggested Answer fields (None when no similar question has an answer) ──
    suggested_answer: Optional[str] = None   # answer from the most similar question
    best_similarity: float = 0.0             # similarity score of the top match


class QuestionListItem(BaseModel):
    question_id: str
    text: str
    tag: str
    tag_confidence: float
    similar_count: int
    created_at: str
    # ── Suggested Answer (persisted when the question was first submitted) ──
    suggested_answer: Optional[str] = None
    best_similarity: float = 0.0
