"""
Machine Learning Router
Triggers ML pipeline execution and returns predictions.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from utils.database import datasets_col, save_ml_results, get_ml_results
from services.ml_pipeline import run_ml_pipeline

router = APIRouter()


# ─── POST /run-ml ──────────────────────────────────────────────────────────────

@router.post("/run-ml")
async def run_ml(
    dataset_id: str = Query(..., description="MongoDB dataset _id"),
    target_column: str | None = Query(None, description="Optional target column name"),
):
    """
    Run the full ML pipeline (Linear Regression + Random Forest) on a dataset.
    If target_column is omitted, the column with the highest variance is chosen.
    """
    from bson import ObjectId

    doc = await datasets_col().find_one({"_id": ObjectId(dataset_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    file_path = doc.get("file_path", "")

    try:
        results = run_ml_pipeline(file_path, target_column=target_column)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"ML pipeline failed: {exc}")

    if "error" in results:
        raise HTTPException(status_code=422, detail=results["error"])

    # Persist results
    result_id = await save_ml_results(dataset_id, results)
    results["result_id"] = result_id

    return JSONResponse(status_code=200, content=results)


# ─── GET /predictions ─────────────────────────────────────────────────────────

@router.get("/predictions")
async def get_predictions(dataset_id: str = Query(...)):
    """Retrieve the most recent ML results for a dataset."""
    results = await get_ml_results(dataset_id)
    if not results:
        raise HTTPException(
            status_code=404,
            detail="No ML results found. Run the ML pipeline first via POST /run-ml."
        )
    return results
