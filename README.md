# DecisionIQ — AI-Powered Decision Intelligence Platform

> Upload any dataset → Auto-profile → Train ML models → Gemini AI insights → Interactive dashboard

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                    │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │  Home    │  │  Upload Page │  │  Dashboard  │  │  AI Insights   │  │
│  │  Page    │  │  (drag-drop) │  │  (Chart.js) │  │  (Gemini MD)   │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬──────┘  └───────┬────────┘  │
│       │               │                  │                  │            │
└───────┼───────────────┼──────────────────┼──────────────────┼────────────┘
        │               │                  │                  │
        │        REST API (FastAPI — port 8000)               │
        │               │                  │                  │
┌───────┼───────────────┼──────────────────┼──────────────────┼────────────┐
│       ▼               ▼                  ▼                  ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    FastAPI Application                           │    │
│  │  POST /upload-dataset   POST /run-ml   POST /generate-insights  │    │
│  │  GET  /dataset-summary  GET /predictions  GET /insights         │    │
│  └────────┬──────────────────────┬───────────────────┬────────────┘    │
│           │                      │                   │                  │
│    ┌──────▼──────┐      ┌────────▼───────┐   ┌──────▼──────────┐      │
│    │   Pandas    │      │  Scikit-learn  │   │  Gemini API     │      │
│    │  Processor  │      │  ML Pipeline   │   │  (Insight Gen.) │      │
│    │             │      │                │   │                 │      │
│    │ • Load CSV  │      │ • Lin. Regress │   │ • Prompt build  │      │
│    │ • Fill NaN  │      │ • Rand. Forest │   │ • Flash model   │      │
│    │ • Dedup     │      │ • Feature imp. │   │ • MD output     │      │
│    │ • Col types │      │ • Cross-val    │   │ • OpenAI fallbk │      │
│    └──────┬──────┘      └────────┬───────┘   └──────┬──────────┘      │
│           │                      │                   │                  │
│    ┌──────▼──────────────────────▼───────────────────▼──────────┐      │
│    │                     MongoDB Atlas                            │      │
│    │   collections: datasets │ ml_results │ ai_insights          │      │
│    └─────────────────────────────────────────────────────────────┘      │
│                          BACKEND                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow (step by step)

```
1. User uploads CSV/Excel
        ↓
2. FastAPI saves file to /uploads
        ↓
3. Pandas pipeline:
   load → fill missing → dedup → detect types → summary stats
        ↓
4. Metadata + summary saved to MongoDB (datasets collection)
        ↓
5. User clicks "Run ML Pipeline"
        ↓
6. Scikit-learn pipeline:
   auto-select target → train Linear Regression + Random Forest
   → predictions, feature importance, metrics
        ↓
7. ML results saved to MongoDB (ml_results collection)
        ↓
8. User clicks "Generate AI Insights"
        ↓
9. Gemini API receives structured prompt with summary + ML results
   → returns markdown business report
        ↓
10. Insights saved to MongoDB (ai_insights collection)
        ↓
11. React dashboard displays:
    charts (Chart.js) + stats + predictions + insights
```

---

## Project Structure

```
decision-intelligence-platform/
│
├── backend/                          # FastAPI Python backend
│   ├── main.py                       # App entry, CORS, router registration
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example                  # Copy to .env and fill in keys
│   │
│   ├── routers/                      # API route handlers
│   │   ├── __init__.py
│   │   ├── dataset.py                # POST /upload-dataset, GET /datasets, etc.
│   │   ├── ml.py                     # POST /run-ml, GET /predictions
│   │   └── insights.py              # POST /generate-insights, GET /insights
│   │
│   ├── services/                     # Business logic
│   │   ├── __init__.py
│   │   ├── data_processor.py         # Pandas data pipeline
│   │   ├── ml_pipeline.py            # Scikit-learn ML pipeline
│   │   └── insight_generator.py      # Gemini / OpenAI integration
│   │
│   └── utils/
│       ├── __init__.py
│       └── database.py               # Motor async MongoDB client + helpers
│
├── frontend/                         # React + Vite frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   │
│   └── src/
│       ├── main.jsx                  # ReactDOM entry
│       ├── App.jsx                   # Root component + client-side router
│       │
│       ├── pages/
│       │   ├── Home.jsx              # Landing page
│       │   ├── UploadPage.jsx        # Drag-drop upload + preview
│       │   ├── Dashboard.jsx         # Chart.js analytics dashboard
│       │   └── InsightsPage.jsx      # AI insights markdown viewer
│       │
│       ├── components/
│       │   └── Navbar.jsx
│       │
│       ├── utils/
│       │   └── api.js                # All fetch() wrappers
│       │
│       └── styles/
│           └── global.css            # Full design system (CSS variables)
│
├── docker-compose.yml                # Full-stack orchestration
├── .gitignore
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key — https://makersuite.google.com/app/apikey

### 1. Clone and configure

```bash
git clone <repo-url>
cd decision-intelligence-platform
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set MONGO_URI and GEMINI_API_KEY
```

**`.env` file:**
```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=decision_intelligence
GEMINI_API_KEY=AIza...your_key_here
OPENAI_API_KEY=sk-...optional_fallback
```

```bash
# Start the API server
uvicorn main:app --reload --port 8000

# API docs available at:
# http://localhost:8000/docs
```

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
# App available at http://localhost:3000
```

### 4. Docker (full stack)

```bash
# From root directory
cp backend/.env.example .env
# Edit .env with your keys

docker-compose up --build
# Backend:  http://localhost:8000
# Frontend: http://localhost:3000
# MongoDB:  localhost:27017
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload-dataset` | Upload CSV/Excel file, triggers processing pipeline |
| `GET`  | `/api/datasets` | List all uploaded datasets |
| `GET`  | `/api/dataset-summary?dataset_id=` | Full summary for a dataset |
| `POST` | `/api/process-data?dataset_id=` | Re-run data processing on existing dataset |
| `POST` | `/api/run-ml?dataset_id=&target_column=` | Train ML models, return predictions |
| `GET`  | `/api/predictions?dataset_id=` | Retrieve stored ML predictions |
| `POST` | `/api/generate-insights?dataset_id=` | Trigger Gemini insight generation |
| `GET`  | `/api/insights?dataset_id=` | Retrieve stored AI insights |
| `DELETE` | `/api/datasets/{dataset_id}` | Delete dataset and file |

### Example: Upload and full pipeline via curl

```bash
# 1. Upload dataset
curl -X POST http://localhost:8000/api/upload-dataset \
  -F "file=@sales_data.csv"
# → returns { "dataset_id": "abc123", "summary": {...} }

# 2. Run ML pipeline
curl -X POST "http://localhost:8000/api/run-ml?dataset_id=abc123"
# → returns { "predictions": [...], "feature_importance": {...}, "metrics": {...} }

# 3. Generate AI insights
curl -X POST "http://localhost:8000/api/generate-insights?dataset_id=abc123"
# → returns { "insight_text": "## Executive Summary\n..." }
```

---

## MongoDB Schema

### `datasets` collection
```json
{
  "_id": "ObjectId",
  "file_name": "a1b2c3.csv",
  "original_name": "sales_q4.csv",
  "file_path": "uploads/a1b2c3.csv",
  "file_size_mb": 1.24,
  "num_rows": 5000,
  "num_columns": 12,
  "column_names": ["revenue", "marketing_spend", "region", "..."],
  "summary": {
    "row_count": 5000,
    "column_count": 12,
    "column_types": { "revenue": "numeric", "region": "categorical" },
    "numeric_columns": ["revenue", "marketing_spend"],
    "missing_value_stats": { "revenue": { "missing_count": 12, "missing_pct": 0.24 } },
    "duplicates_removed": 3,
    "column_stats": [...],
    "correlation_matrix": {...},
    "sample_data": [...]
  },
  "upload_time": "2024-11-01T10:30:00Z"
}
```

### `ml_results` collection
```json
{
  "_id": "ObjectId",
  "dataset_id": "abc123",
  "target_column": "revenue",
  "feature_columns": ["marketing_spend", "headcount", "price"],
  "best_model": "Random Forest",
  "actual_values": [1200, 1340, ...],
  "predicted_values": [1215, 1328, ...],
  "feature_importance": { "marketing_spend": 62.4, "headcount": 21.1 },
  "models": {
    "linear_regression": { "metrics": { "r2": 0.74, "rmse": 142.3 } },
    "random_forest": { "metrics": { "r2": 0.89, "rmse": 98.1, "cv_r2": 0.87 } }
  },
  "trend_analysis": { "labels": [...], "raw": [...], "trend": [...] },
  "created_at": "2024-11-01T10:32:00Z"
}
```

### `ai_insights` collection
```json
{
  "_id": "ObjectId",
  "dataset_id": "abc123",
  "insight_text": "## Executive Summary\nRevenue is strongly influenced by marketing spend...",
  "created_at": "2024-11-01T10:33:00Z"
}
```

---

## ML Pipeline Details

The pipeline is **fully domain-agnostic**. It works on any numeric dataset:

| Step | Detail |
|------|--------|
| **Target selection** | Auto-selects the numeric column with highest variance; or use `target_column` param |
| **Feature selection** | All remaining numeric columns become features |
| **Preprocessing** | `SimpleImputer(median)` → `StandardScaler` via sklearn `Pipeline` |
| **Model 1** | `LinearRegression` — fast, interpretable, good baseline |
| **Model 2** | `RandomForestRegressor(n_estimators=100)` — robust, handles non-linearity |
| **Validation** | 80/20 train-test split + 5-fold cross-validation |
| **Metrics** | R², MAE, RMSE, MSE, CV-R² |
| **Feature importance** | RF: built-in `.feature_importances_` / LR: absolute coefficients (%) |

---

## Gemini Prompt Design

The insight generator sends a structured 5-section prompt to Gemini 1.5 Flash:

```
1. Dataset overview (rows, columns, type breakdown, high-missing columns)
2. ML results (R², RMSE, MAE, CV-R², best model)
3. Top 5 features with importance %
4. Requested output sections:
   - Executive Summary
   - Key Findings
   - Driver Analysis
   - Risk Flags
   - Strategic Recommendations
   - Predicted Trend reliability
```

The model is configured with `temperature=0.4` for consistent, professional output.

---

## Extending the Platform

### Add a new ML model

In `backend/services/ml_pipeline.py`:

```python
from sklearn.ensemble import GradientBoostingRegressor

def _train_gradient_boosting(X_train, X_test, y_train, y_test, features) -> dict:
    pipe = _build_sklearn_pipeline(
        GradientBoostingRegressor(n_estimators=200, learning_rate=0.05, random_state=42)
    )
    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_test)
    cv_r2 = cross_val_score(pipe, X_train, y_train, cv=5, scoring="r2").mean()
    importances = pipe.named_steps["model"].feature_importances_
    importance_pct = {f: round(float(v)*100, 2) for f, v in zip(features, importances)}
    return {
        "model_name": "Gradient Boosting",
        "predictions": [round(float(v), 4) for v in y_pred],
        "feature_importance": importance_pct,
        "metrics": _metrics(y_test, y_pred, cv_r2),
    }
```

### Add classification support

Detect binary/low-cardinality targets and switch to `RandomForestClassifier` + accuracy/F1 metrics.

### Add time-series support

Detect datetime index columns → use `statsmodels` ARIMA or Facebook Prophet for forecasting.

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend UI | React 18 + Vite | SPA, component architecture |
| Charts | Chart.js 4 | Line, bar, doughnut visualizations |
| API | FastAPI + Uvicorn | Async REST API |
| Database | MongoDB Atlas + Motor | Async document storage |
| Data Processing | Pandas + NumPy | ETL, profiling, cleaning |
| Machine Learning | Scikit-learn | Linear Regression, Random Forest |
| AI Insights | Google Gemini 1.5 Flash | Business report generation |
| AI Fallback | OpenAI GPT-4o-mini | Optional fallback |
| Containers | Docker + Docker Compose | Full-stack orchestration |
