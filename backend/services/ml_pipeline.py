"""
Generic ML Pipeline — handles messy real-world datasets robustly.
"""
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Any
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer


def run_ml_pipeline(file_path: str, target_column: str | None = None) -> dict[str, Any]:
    df = _load_and_clean(file_path)

    numeric_df = df.select_dtypes(include=[np.number]).copy()
    numeric_df = numeric_df.dropna(axis=1, how="all")
    numeric_df = numeric_df.loc[:, numeric_df.nunique() > 1]

    # Drop rows where ALL numeric values are NaN
    numeric_df = numeric_df.dropna(how="all")

    if numeric_df.shape[1] < 2:
        return {"error": "Need at least 2 numeric columns with real data for ML analysis."}
    if numeric_df.shape[0] < 4:
        return {"error": f"Only {numeric_df.shape[0]} valid rows. Need at least 4 rows for ML."}

    target = target_column if target_column and target_column in numeric_df.columns \
             else _auto_select_target(numeric_df)

    features = [c for c in numeric_df.columns if c != target]

    # Drop rows where target is NaN
    valid = numeric_df[[target] + features].dropna(subset=[target])
    if len(valid) < 4:
        return {"error": f"Target column '{target}' has too few non-null values ({len(valid)})."}

    X = valid[features]
    y = valid[target]

    test_size = 0.25 if len(valid) < 20 else 0.2
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
    except Exception as e:
        return {"error": f"Train/test split failed: {e}"}

    cv_folds = min(3, max(2, len(X_train) // 2))

    lr = _train_linear_regression(X_train, X_test, y_train, y_test, features, cv_folds)
    rf = _train_random_forest(X_train, X_test, y_train, y_test, features, cv_folds)

    best = rf if rf["metrics"]["r2"] >= lr["metrics"]["r2"] else lr

    n = min(100, len(y_test))
    return {
        "target_column": target,
        "feature_columns": features,
        "dataset_size": len(valid),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "models": {"linear_regression": lr, "random_forest": rf},
        "best_model": best["model_name"],
        "actual_values": y_test.values[:n].tolist(),
        "predicted_values": best["predictions"][:n],
        "feature_importance": best.get("feature_importance", {}),
        "trend_analysis": _compute_trend(valid, target),
    }


def _load_and_clean(file_path: str) -> pd.DataFrame:
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext == ".csv":
        df = None
        for enc in ("utf-8", "latin-1", "cp1252"):
            try:
                df = pd.read_csv(path, encoding=enc)
                break
            except UnicodeDecodeError:
                continue
        if df is None:
            raise ValueError("Could not read CSV file")
    elif ext in (".xlsx", ".xls"):
        # Find real header row (skip title/merged rows)
        raw = pd.read_excel(path, header=None)
        header_row = 0
        for i, row in raw.iterrows():
            non_null = row.dropna()
            if len(non_null) >= 2:
                header_row = int(i)
                break
        df = pd.read_excel(path, header=header_row)
    else:
        raise ValueError(f"Unsupported format: {ext}")

    # Clean column names
    df.columns = [str(c).strip() for c in df.columns]

    # Drop fully empty rows and columns
    df = df.dropna(how="all").dropna(axis=1, how="all").reset_index(drop=True)

    # Convert percentage strings like "70%" → 70.0
    for col in df.columns:
        if df[col].dtype == object:
            try:
                converted = pd.to_numeric(
                    df[col].astype(str).str.strip().str.rstrip('%'),
                    errors='coerce'
                )
                if converted.notna().sum() >= len(df) * 0.5:
                    df[col] = converted
            except Exception:
                pass

    return df


def _auto_select_target(df: pd.DataFrame) -> str:
    # Pick column with highest variance that has enough non-null values
    valid_cols = df.columns[df.notna().sum() >= max(4, len(df) * 0.5)]
    if len(valid_cols) == 0:
        return df.columns[0]
    return df[valid_cols].var().idxmax()


def _build_pipeline(model) -> Pipeline:
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("model", model),
    ])


def _train_linear_regression(X_train, X_test, y_train, y_test, features, cv_folds) -> dict:
    pipe = _build_pipeline(LinearRegression())
    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_test)
    coefs = pipe.named_steps["model"].coef_
    total = sum(abs(float(c)) for c in coefs) or 1
    importance_pct = {f: round(abs(float(c)) / total * 100, 2) for f, c in zip(features, coefs)}
    try:
        cv_r2 = float(cross_val_score(pipe, X_train, y_train, cv=cv_folds, scoring="r2").mean())
    except Exception:
        cv_r2 = 0.0
    return {
        "model_name": "Linear Regression",
        "predictions": [round(float(v), 4) for v in y_pred],
        "feature_importance": importance_pct,
        "metrics": _metrics(y_test, y_pred, cv_r2),
    }


def _train_random_forest(X_train, X_test, y_train, y_test, features, cv_folds) -> dict:
    pipe = _build_pipeline(RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1))
    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_test)
    imps = pipe.named_steps["model"].feature_importances_
    importance_pct = {
        f: round(float(v) * 100, 2)
        for f, v in sorted(zip(features, imps), key=lambda x: -x[1])
    }
    try:
        cv_r2 = float(cross_val_score(pipe, X_train, y_train, cv=cv_folds, scoring="r2").mean())
    except Exception:
        cv_r2 = 0.0
    return {
        "model_name": "Random Forest",
        "predictions": [round(float(v), 4) for v in y_pred],
        "feature_importance": importance_pct,
        "metrics": _metrics(y_test, y_pred, cv_r2),
    }


def _metrics(y_true, y_pred, cv_r2: float) -> dict:
    mse = mean_squared_error(y_true, y_pred)
    return {
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "rmse": round(float(np.sqrt(mse)), 4),
        "mse": round(float(mse), 4),
        "cv_r2": round(float(cv_r2), 4),
    }


def _compute_trend(df: pd.DataFrame, target: str) -> dict:
    series = df[target].dropna().reset_index(drop=True)
    if len(series) < 2:
        return {"labels": [], "raw": [], "trend": []}
    window = max(2, len(series) // 5)
    rolling = series.rolling(window, min_periods=1).mean()
    n = min(200, len(series))
    step = max(1, len(series) // n)
    return {
        "labels": list(range(0, len(series), step))[:n],
        "raw": [round(float(v), 4) for v in series.iloc[::step][:n]],
        "trend": [round(float(v), 4) for v in rolling.iloc[::step][:n]],
    }
