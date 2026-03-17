"""
Data Processing Pipeline — Pandas-based profiling and cleaning.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Any
from datetime import datetime


def process_dataset(file_path: str) -> dict[str, Any]:
    df = _load_file(file_path)
    df, missing_report = _handle_missing_values(df)
    df, duplicates_removed = _remove_duplicates(df)
    column_types = _detect_column_types(df)
    summary = _build_summary(df, column_types, missing_report, duplicates_removed)
    sample = df.head(10).copy()
    # Convert datetime columns to string for JSON
    for col in sample.columns:
        if pd.api.types.is_datetime64_any_dtype(sample[col]):
            sample[col] = sample[col].astype(str)
    summary["sample_data"] = sample.replace({np.nan: None}).to_dict(orient="records")
    return _fix_types(summary)


def _fix_types(obj):
    """Recursively convert non-JSON-serializable types."""
    if isinstance(obj, dict):
        return {k: _fix_types(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_fix_types(i) for i in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return None if np.isnan(obj) else float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    if isinstance(obj, float) and np.isnan(obj):
        return None
    return obj


def _load_file(file_path: str) -> pd.DataFrame:
    path = Path(file_path)
    ext = path.suffix.lower()
    if ext == ".csv":
        for encoding in ("utf-8", "latin-1", "cp1252"):
            try:
                return pd.read_csv(path, encoding=encoding)
            except UnicodeDecodeError:
                continue
        raise ValueError("Could not decode CSV.")
    if ext in (".xlsx", ".xls"):
        # Skip merged title rows — find real header
        raw = pd.read_excel(path, header=None)
        header_row = 0
        for i, row in raw.iterrows():
            if row.dropna().__len__() >= 2:
                header_row = int(i)
                break
        return pd.read_excel(path, header=header_row)
    raise ValueError(f"Unsupported file type: {ext}")


def _handle_missing_values(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    missing_report = {}
    for col in df.columns:
        missing_count = int(df[col].isna().sum())
        if missing_count == 0:
            continue
        missing_report[col] = {
            "missing_count": missing_count,
            "missing_pct": round(missing_count / len(df) * 100, 2),
        }
        if pd.api.types.is_numeric_dtype(df[col]):
            fill_val = df[col].median()
            df[col] = df[col].fillna(fill_val)
            missing_report[col]["strategy"] = f"filled with median ({fill_val:.4g})"
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].ffill().bfill()
            missing_report[col]["strategy"] = "forward/back-filled"
        else:
            df[col] = df[col].fillna("Unknown")
            missing_report[col]["strategy"] = "filled with 'Unknown'"
    return df, missing_report


def _remove_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    before = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    return df, before - len(df)


def _detect_column_types(df: pd.DataFrame) -> dict[str, str]:
    type_map = {}
    n = len(df)
    for col in df.columns:
        series = df[col]
        if pd.api.types.is_numeric_dtype(series):
            type_map[col] = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(series):
            type_map[col] = "datetime"
        else:
            try:
                parsed = pd.to_datetime(series, errors="coerce")
                if parsed.notna().mean() > 0.8:
                    df[col] = parsed
                    type_map[col] = "datetime"
                    continue
            except Exception:
                pass
            unique_ratio = series.nunique() / n if n > 0 else 0
            type_map[col] = "text" if unique_ratio > 0.5 else "categorical"
    return type_map


def _build_summary(df, column_types, missing_report, duplicates_removed) -> dict:
    numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
    column_stats = []
    for col in df.columns:
        col_type = column_types.get(col, "unknown")
        stat = {
            "name": col,
            "type": col_type,
            "null_count": int(df[col].isna().sum()),
            "unique_count": int(df[col].nunique()),
        }
        if col_type == "numeric":
            stat.update({
                "mean": _safe_float(df[col].mean()),
                "std": _safe_float(df[col].std()),
                "min": _safe_float(df[col].min()),
                "max": _safe_float(df[col].max()),
                "median": _safe_float(df[col].median()),
            })
        elif col_type == "categorical":
            top_vals = df[col].value_counts().head(5)
            stat["top_values"] = top_vals.index.tolist()
            stat["top_counts"] = top_vals.values.tolist()
        column_stats.append(stat)

    correlation_matrix = {}
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols[:10]].corr().round(3)
        correlation_matrix = corr.replace({np.nan: None}).to_dict()

    return {
        "row_count": len(df),
        "column_count": len(df.columns),
        "column_types": column_types,
        "numeric_columns": numeric_cols,
        "categorical_columns": [c for c, t in column_types.items() if t == "categorical"],
        "datetime_columns": [c for c, t in column_types.items() if t == "datetime"],
        "missing_value_stats": missing_report,
        "duplicates_removed": duplicates_removed,
        "column_stats": column_stats,
        "correlation_matrix": correlation_matrix,
    }


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        return None if np.isnan(f) else round(f, 4)
    except (TypeError, ValueError):
        return None
