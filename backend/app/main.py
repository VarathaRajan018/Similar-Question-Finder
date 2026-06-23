"""
main.py — FastAPI application entry point
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth_routes import router as auth_router
from app.routes.question_routes import router as question_router

# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Similar Question Finder",
    description=(
        "EdTech API: submit study questions, find semantically similar past "
        "questions, and auto-tag by subject — all using local ML embeddings."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow the React frontend (and any localhost port during development)
# ---------------------------------------------------------------------------
FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://localhost:3000", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(question_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/", tags=["health"])
async def health_check():
    """Simple health-check — confirms the server is running."""
    return {"status": "ok", "service": "Similar Question Finder API"}
