"""
AI Insights Router
Calls the Gemini-based insight generator and caches results in MongoDB.
"""

from fastapi import APIRouter, HTTPException, Query

from utils.database import (
    datasets_col, get_ml_results,
    save_insights, get_insights,
)
from services.insight_generator import generate_insights

router = APIRouter()


# ─── POST /generate-insights ─────────────────────────────────────────────────

@router.post("/generate-insights")
async def trigger_insight_generation(dataset_id: str = Query(...)):
    """
    Generate AI insights for a dataset.
    Requires ML results to exist (POST /run-ml first).
    """
    from bson import ObjectId

    # Fetch dataset doc
    doc = await datasets_col().find_one({"_id": ObjectId(dataset_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    dataset_summary = doc.get("summary", {})

    # Fetch ML results
    ml_results = await get_ml_results(dataset_id)
    if not ml_results:
        raise HTTPException(
            status_code=400,
            detail="No ML results found. Please run the ML pipeline first via POST /run-ml."
        )

    # Generate insights via Gemini / OpenAI
    try:
        insight_text = await generate_insights(dataset_summary, ml_results)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Insight generation failed: {exc}")

    # Persist
    insight_id = await save_insights(dataset_id, insight_text)

    return {
        "insight_id": insight_id,
        "dataset_id": dataset_id,
        "insight_text": insight_text,
    }


# ─── GET /insights ────────────────────────────────────────────────────────────

@router.get("/insights")
async def fetch_insights(dataset_id: str = Query(...)):
    """Retrieve the most recent AI insights for a dataset."""
    result = await get_insights(dataset_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="No insights found. Run POST /generate-insights first."
        )
    return result
