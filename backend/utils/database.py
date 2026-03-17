"""
MongoDB Atlas Connection & Database Utilities
Uses Motor (async MongoDB driver) for non-blocking I/O with FastAPI
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import DESCENDING
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "decision_intelligence")

# Singleton client
_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    """Return the Motor MongoDB client (singleton)."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            maxPoolSize=10
        )
    return _client


def get_db():
    """Return the application database."""
    return get_client()[DB_NAME]


# ─── Collection accessors ────────────────────────────────────────────────────

def datasets_col():
    return get_db()["datasets"]

def results_col():
    return get_db()["ml_results"]

def insights_col():
    return get_db()["ai_insights"]


# ─── Helper functions ────────────────────────────────────────────────────────

async def save_dataset_metadata(metadata: dict) -> str:
    """
    Persist dataset metadata to MongoDB.

    Expected fields:
        file_name, original_name, file_path, file_size,
        num_rows, num_columns, column_names, upload_time
    Returns the inserted document ID as a string.
    """
    metadata["upload_time"] = datetime.utcnow()
    result = await datasets_col().insert_one(metadata)
    return str(result.inserted_id)


async def get_all_datasets() -> list[dict]:
    """Return all datasets, newest first."""
    cursor = datasets_col().find({}, {"_id": 1, "file_name": 1,
                                      "original_name": 1, "num_rows": 1,
                                      "num_columns": 1, "upload_time": 1,
                                      "file_size": 1}) \
                            .sort("upload_time", DESCENDING)
    docs = await cursor.to_list(length=100)
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs


async def save_ml_results(dataset_id: str, results: dict) -> str:
    """Persist ML pipeline output."""
    doc = {
        "dataset_id": dataset_id,
        "created_at": datetime.utcnow(),
        **results
    }
    result = await results_col().insert_one(doc)
    return str(result.inserted_id)


async def get_ml_results(dataset_id: str) -> Optional[dict]:
    """Retrieve the latest ML results for a dataset."""
    doc = await results_col().find_one(
        {"dataset_id": dataset_id},
        sort=[("created_at", DESCENDING)]
    )
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def save_insights(dataset_id: str, insight_text: str) -> str:
    """Persist Gemini-generated insights."""
    doc = {
        "dataset_id": dataset_id,
        "insight_text": insight_text,
        "created_at": datetime.utcnow()
    }
    result = await insights_col().insert_one(doc)
    return str(result.inserted_id)


async def get_insights(dataset_id: str) -> Optional[dict]:
    """Retrieve latest AI insights for a dataset."""
    doc = await insights_col().find_one(
        {"dataset_id": dataset_id},
        sort=[("created_at", DESCENDING)]
    )
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def close_connection():
    """Gracefully close the MongoDB connection."""
    global _client
    if _client:
        _client.close()
        _client = None
