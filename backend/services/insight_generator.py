"""
AI Insight Generation Service — Generic, domain-agnostic insights via Gemini.
"""

import os
import json
from typing import Any
import google.generativeai as genai
from dotenv import load_dotenv


def _get_api_keys():
    load_dotenv(override=True)
    return os.getenv("GEMINI_API_KEY", ""), os.getenv("OPENAI_API_KEY", "")


def _build_prompt(dataset_summary: dict[str, Any], ml_results: dict[str, Any]) -> str:
    row_count = dataset_summary.get("row_count", "N/A")
    col_count = dataset_summary.get("column_count", "N/A")
    target = ml_results.get("target_column", "N/A")
    best_model = ml_results.get("best_model", "N/A")

    metrics = ml_results.get("models", {}).get(
        "random_forest" if "Random Forest" in best_model else "linear_regression", {}
    ).get("metrics", {})

    r2 = metrics.get("r2", "N/A")
    mae = metrics.get("mae", "N/A")
    feature_importance = ml_results.get("feature_importance", {})
    top_features = sorted(feature_importance.items(), key=lambda x: -x[1])[:5]

    # Accuracy label
    try:
        r2_val = float(r2)
        if r2_val >= 0.85: accuracy_label = "excellent (very reliable)"
        elif r2_val >= 0.65: accuracy_label = "good (reasonably reliable)"
        elif r2_val >= 0.4: accuracy_label = "moderate (use as a guide)"
        else: accuracy_label = "low (high uncertainty — needs more data)"
    except Exception:
        accuracy_label = "unknown"

    # Column stats context
    col_stats = dataset_summary.get("column_stats", [])
    numeric_stats = [c for c in col_stats if c.get("type") == "numeric"]
    stats_lines = ""
    for c in numeric_stats[:6]:
        stats_lines += f"  - {c['name']}: avg={c.get('mean','?')}, min={c.get('min','?')}, max={c.get('max','?')}, std={c.get('std','?')}\n"

    # Column types
    col_types = dataset_summary.get("column_types", {})
    categorical_cols = [k for k, v in col_types.items() if v == "categorical"]

    missing = dataset_summary.get("missing_value_stats", {})
    high_missing = [c for c, s in missing.items() if s.get("missing_pct", 0) > 20]

    prompt = f"""
You are an expert data analyst. You have been given a dataset and machine learning results.
Your job is to generate clear, helpful, and GENERIC insights that work for ANY type of dataset —
whether it's about health, finance, education, sports, sales, science, or anything else.

DO NOT assume this is a "business" dataset. Adapt your language to what the data actually contains.

═══════════════════════════
DATASET INFORMATION
═══════════════════════════
- Total records: {row_count:,}
- Total columns: {col_count}
- Categorical columns: {categorical_cols if categorical_cols else "None"}
- Columns with >20% missing data: {high_missing if high_missing else "None"}

NUMERIC COLUMN STATISTICS:
{stats_lines if stats_lines else "  No numeric stats available"}

═══════════════════════════
ML ANALYSIS RESULTS
═══════════════════════════
- The model is predicting: {target}
- Best algorithm: {best_model}
- Prediction accuracy: {accuracy_label} (R²={r2})
- Average prediction error (MAE): {mae}

TOP FACTORS INFLUENCING {target}:
{chr(10).join(f"  {i+1}. {feat.replace('_',' ')}: {imp:.1f}% influence" for i, (feat, imp) in enumerate(top_features))}

═══════════════════════════
YOUR TASK
═══════════════════════════
Write a clear, friendly analysis report using EXACTLY these sections.
Adapt the tone and terminology to suit what the data is actually about.
Do NOT use generic business phrases like "stakeholders", "ROI", or "revenue" unless the data is actually about those things.

## Summary
2-3 sentences. What does this dataset show? What is being predicted and how well?

## Key Patterns Found
3-5 bullet points. What are the most interesting things discovered in this data?
Each bullet should be a plain-English sentence a non-technical person would understand.

## What Drives {target.replace("_", " ")}?
Explain each top factor in plain language. What does it mean that this factor has high influence?
Avoid jargon. Give real-world meaning to each factor.

## Data Quality Notes
Are there any concerns about the data? Missing values? Limited sample size? Anything that affects reliability?
Keep this brief — 2-3 sentences max.

## What You Can Do With This
3-4 specific, practical suggestions based on these findings.
These should be relevant to what this data is actually measuring — not generic business advice.

## How Reliable Are the Predictions?
In plain terms, explain what the accuracy score means for this specific use case.
When should someone trust these predictions? When should they be cautious?

Write in a warm, clear, professional tone. Avoid markdown tables. Use bullet points where appropriate.
""".strip()

    return prompt


async def generate_insights(
    dataset_summary: dict[str, Any],
    ml_results: dict[str, Any],
) -> str:
    GEMINI_API_KEY, OPENAI_API_KEY = _get_api_keys()
    prompt = _build_prompt(dataset_summary, ml_results)

    if GEMINI_API_KEY:
        models_to_try = [
            "gemini-2.0-flash-lite",
            "gemini-2.5-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-2.0-flash",
            "gemini-flash-latest",
            "gemini-2.5-flash",
        ]
        for model_name in models_to_try:
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.4,
                        max_output_tokens=2048,
                    )
                )
                print(f"[Gemini] Success with model: {model_name}")
                return response.text
            except Exception as e:
                print(f"[Gemini] {model_name} failed: {e}")
                continue
        if not OPENAI_API_KEY:
            raise RuntimeError("All Gemini models failed. Check your quota at https://ai.dev/rate-limit or add OPENAI_API_KEY as fallback.")

    if OPENAI_API_KEY:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=OPENAI_API_KEY)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert data analyst. Write clear, generic insights that adapt to any dataset domain."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
                max_tokens=2048,
            )
            return resp.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"OpenAI also failed: {e}")

    # Rule-based fallback
    target = ml_results.get("target_column", "the target variable")
    metrics = ml_results.get("models", {}).get("random_forest", {}).get("metrics", {})
    r2 = metrics.get("r2", "N/A")
    top_features = list(ml_results.get("feature_importance", {}).keys())[:3]

    return f"""
## Summary
The dataset was processed and a machine learning model was trained to predict **{target}**.
The model achieved an accuracy (R²) of **{r2}**.

## Key Patterns Found
- Top influencing factors: **{", ".join(f.replace("_", " ") for f in top_features) if top_features else "N/A"}**
- Best performing model: **{ml_results.get("best_model", "N/A")}**
- Training data size: **{ml_results.get("train_size", "N/A")}** records

## What You Can Do With This
1. Review the feature importance chart to understand key drivers.
2. Collect more data to improve prediction accuracy.
3. Set up a Gemini API key for full AI-generated insights.

*Add your GEMINI_API_KEY to the .env file for a complete analysis.*
""".strip()
