"""
Dataset Router
Handles file upload, metadata storage, and summary retrieval.
"""

import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse

from utils.database import (
    save_dataset_metadata,
    get_all_datasets,
    datasets_col,
)
from services.data_processor import process_dataset

router = APIRouter()
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE_MB = 50


# ─── POST /upload-dataset ─────────────────────────────────────────────────────

@router.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Accept a CSV or Excel file, persist it, run the data processing pipeline,
    and store dataset metadata + summary in MongoDB.
    """
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: CSV, XLSX, XLS."
        )

    # Read file content
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_FILE_SIZE_MB} MB limit ({size_mb:.1f} MB)."
        )

    # Save file with a unique name
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / unique_name
    file_path.write_bytes(content)

    # Run the processing pipeline
    try:
        summary = process_dataset(str(file_path))
    except Exception as exc:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Processing failed: {exc}")

    # Persist metadata to MongoDB
    metadata = {
        "file_name": unique_name,
        "original_name": file.filename,
        "file_path": str(file_path),
        "file_size_mb": round(size_mb, 3),
        "num_rows": summary["row_count"],
        "num_columns": summary["column_count"],
        "column_names": list(summary["column_types"].keys()),
        "summary": summary,
        "upload_time": datetime.utcnow().isoformat(),
    }
    dataset_id = await save_dataset_metadata(metadata)

    return JSONResponse(
        status_code=201,
        content={
            "dataset_id": dataset_id,
            "file_name": unique_name,
            "original_name": file.filename,
            "file_size_mb": round(size_mb, 3),
            "summary": summary,
            "message": "Dataset uploaded and processed successfully.",
        }
    )


# ─── POST /process-data ───────────────────────────────────────────────────────

@router.post("/process-data")
async def reprocess_dataset(dataset_id: str = Query(..., description="MongoDB dataset _id")):
    """Re-run the data processing pipeline on an already-uploaded dataset."""
    from bson import ObjectId

    doc = await datasets_col().find_one({"_id": ObjectId(dataset_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    try:
        summary = process_dataset(doc["file_path"])
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Processing failed: {exc}")

    await datasets_col().update_one(
        {"_id": ObjectId(dataset_id)},
        {"$set": {"summary": summary}}
    )

    return {"dataset_id": dataset_id, "summary": summary}


# ─── GET /dataset-summary ─────────────────────────────────────────────────────

@router.get("/dataset-summary")
async def get_dataset_summary(dataset_id: str = Query(...)):
    """Return the summary for a specific dataset."""
    from bson import ObjectId

    doc = await datasets_col().find_one({"_id": ObjectId(dataset_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    doc["_id"] = str(doc["_id"])
    return doc


# ─── GET /datasets ────────────────────────────────────────────────────────────

@router.get("/datasets")
async def list_datasets():
    """Return a list of all uploaded datasets (newest first)."""
    datasets = await get_all_datasets()
    return {"datasets": datasets, "count": len(datasets)}


# ─── DELETE /datasets/{dataset_id} ───────────────────────────────────────────

@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Delete a dataset record and its uploaded file."""
    from bson import ObjectId

    doc = await datasets_col().find_one({"_id": ObjectId(dataset_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    # Remove the file
    file_path = Path(doc.get("file_path", ""))
    if file_path.exists():
        file_path.unlink()

    await datasets_col().delete_one({"_id": ObjectId(dataset_id)})
    return {"message": "Dataset deleted.", "dataset_id": dataset_id}
