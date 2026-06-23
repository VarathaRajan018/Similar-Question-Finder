"""
database.py — Async MongoDB connection via Motor
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

MONGO_URI: str = os.getenv(
    "MONGO_URI",
    "mongodb+srv://varatharajan0180_db_user:varatha18@cluster0.e9rzq4m.mongodb.net/",
)
DB_NAME: str = os.getenv("DB_NAME", "similar_questions_db")

# Single client instance — reused across all requests (Motor is async-safe)
_client: AsyncIOMotorClient = AsyncIOMotorClient(MONGO_URI)
db: AsyncIOMotorDatabase = _client[DB_NAME]


def get_db() -> AsyncIOMotorDatabase:
    """Return the shared Motor database instance."""
    return db
