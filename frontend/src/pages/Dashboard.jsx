import React, { useState, useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { api } from "../utils/api";

Chart.register(...registerables);

// ─── Chart Components ─────────────────────────────────────────────────────────

function LineChart({ labels, datasets }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !labels?.length) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "#8899aa", font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: "#4a5568", maxTicksLimit: 8 }, grid: { color: "rgba(255,255,255,0.04)" } },
          y: { ticks: { color: "#4a5568", callback: v => typeof v === "number" && v >= 1000 ? `${(v/1000).toFixed(0)}k` : v }, grid: { color: "rgba(255,255,255,0.04)" } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [labels, datasets]);
  return <canvas ref={ref} style={{ height: "100%", width: "100%" }} />;
}

function BarChart({ labels, datasets, horizontal = false }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !labels?.length) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: { labels, datasets },
      options: {
        indexAxis: horizontal ? "y" : "x",
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#4a5568" }, grid: { color: "rgba(255,255,255,0.04)" } },
          y: { ticks: { color: "#4a5568" }, grid: { color: "rgba(255,255,255,0.04)" } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [labels, datasets, horizontal]);
  return <canvas ref={ref} style={{ height: "100%", width: "100%" }} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val) {
  if (val === null || val === undefined) return "—";
  const n = Number(val);
  if (isNaN(n)) return val;
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}

function r2ToLabel(r2) {
  if (r2 === null || r2 === undefined) return { label: "—", color: "var(--text-muted)", desc: "" };
  const v = Number(r2);
  if (v >= 0.85) return { label: "Excellent", color: "var(--accent)", desc: "Very reliable predictions" };
  if (v >= 0.65) return { label: "Good", color: "#60a5fa", desc: "Reasonably reliable predictions" };
  if (v >= 0.4)  return { label: "Fair", color: "var(--warning)", desc: "Moderate reliability — use as a guide" };
  return { label: "Needs more data", color: "var(--danger)", desc: "Predictions have high uncertainty" };
}

// ─── Accuracy Meter ───────────────────────────────────────────────────────────

function AccuracyMeter({ r2 }) {
  const pct = Math.max(0, Math.min(100, Math.round((Number(r2) || 0) * 100)));
  const { label, color, desc } = r2ToLabel(r2);
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-glow)", borderRadius: "var(--radius-md)", padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Prediction Accuracy</span>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.6rem", color }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--bg-hover)", overflow: "hidden", marginBottom: "0.5rem" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.8s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color }}>{label}</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{desc}</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function Dashboard({ dataset, navigate }) {
  const [mlResults, setMlResults] = useState(null);
  const [runningML, setRunningML] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const summary = dataset?.summary;

  useEffect(() => {
    if (!dataset?.id) return;
    api.getPredictions(dataset.id).then(setMlResults).catch(() => {});
  }, [dataset?.id]);

  const runML = async () => {
    if (!dataset?.id) return;
    setRunningML(true); setError(null);
    try { setMlResults(await api.runML(dataset.id)); }
    catch (e) { setError(e.message); }
    finally { setRunningML(false); }
  };

  if (!dataset) {
    return (
      <div className="section" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>No dataset loaded.</p>
        <button className="btn btn-primary" onClick={() => navigate("upload")}>Upload Dataset →</button>
      </div>
    );
  }

  const colStats = summary?.column_stats?.filter(c => c.type === "numeric") || [];
  const bestMetrics = mlResults
    ? (mlResults.best_model === "Random Forest"
        ? mlResults.models?.random_forest?.metrics
        : mlResults.models?.linear_regression?.metrics) || {}
    : {};
  const r2 = bestMetrics.r2;

  // Trend chart
  const trend = mlResults?.trend_analysis;
  const trendDatasets = trend ? [
    { label: "Raw", data: trend.raw, borderColor: "rgba(0,217,170,0.3)", tension: 0.4, pointRadius: 0, fill: false },
    { label: "Trend", data: trend.trend, borderColor: "#00d9aa", backgroundColor: "rgba(0,217,170,0.05)", tension: 0.4, fill: true, pointRadius: 0 },
  ] : [];

  // Prediction chart
  const predLabels = mlResults?.actual_values?.map((_, i) => `#${i + 1}`) || [];
  const predDatasets = mlResults ? [
    { label: "Actual", data: mlResults.actual_values, borderColor: "#7c6cff", backgroundColor: "rgba(124,108,255,0.05)", tension: 0.3, fill: true, pointRadius: 2 },
    { label: "Predicted", data: mlResults.predicted_values, borderColor: "#00d9aa", backgroundColor: "transparent", tension: 0.3, borderDash: [4, 4], pointRadius: 2 },
  ] : [];

  // Feature importance
  const featureImportance = mlResults?.feature_importance || {};
  const topFeatures = Object.entries(featureImportance).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Smart data cards
  const smartCards = colStats.slice(0, 4).map(col => ({
    label: col.name.replace(/_/g, " "),
    value: fmt(col.mean),
    sub: `${fmt(col.min)} — ${fmt(col.max)}`,
    color: "var(--accent)",
  }));

  return (
    <div className="section fade-up">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="badge badge-accent" style={{ marginBottom: "0.5rem" }}>Analytics Dashboard</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.2rem,3vw,1.75rem)", wordBreak: "break-word" }}>{dataset.name}</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            {summary?.row_count?.toLocaleString()} records · {summary?.column_count} columns · {summary?.numeric_columns?.length} numeric
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {!mlResults && !runningML && (
            <button className="btn btn-primary" onClick={runML}>▶ Analyse Data</button>
          )}
          {mlResults && (
            <>
              <button className="btn btn-ghost" onClick={() => navigate("insights", dataset)}>✦ AI Insights →</button>
              <button className="btn btn-secondary" onClick={runML} disabled={runningML} style={{ fontSize: "0.8rem" }}>↺</button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          ⚠ {error}
          <br /><small>Make sure your dataset has at least 2 numeric columns.</small>
        </div>
      )}

      {runningML && (
        <div className="loading-center" style={{ marginBottom: "2rem" }}>
          <div className="spinner" />
          <p>Analysing your data… this may take 15–30 seconds for large datasets</p>
        </div>
      )}

      {/* Smart Summary Cards */}
      {smartCards.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
            Dataset Averages
          </p>
          <div className="grid-4">
            {smartCards.map((c, i) => (
              <div key={i} className="stat-card">
                <div className="stat-card__label" style={{ textTransform: "capitalize" }}>{c.label}</div>
                <div className="stat-card__value" style={{ fontSize: "1.5rem", color: c.color }}>{c.value}</div>
                <div className="stat-card__sub">Range: {c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ML Summary — only show when results exist */}
      {mlResults && (
        <>
          {/* Accuracy + Key insight row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
            <AccuracyMeter r2={r2} />
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1.25rem" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Predicting
              </p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--accent)", marginBottom: "0.4rem" }}>
                {mlResults.target_column?.replace(/_/g, " ")}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Average error: <strong style={{ color: "var(--text-primary)" }}>{fmt(bestMetrics.mae)}</strong> units
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Trained on <strong style={{ color: "var(--text-primary)" }}>{mlResults.train_size?.toLocaleString()}</strong> records
              </p>
            </div>
          </div>

          {/* Advanced toggle */}
          <div style={{ marginBottom: "1.25rem" }}>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              {showAdvanced ? "▼" : "▶"} {showAdvanced ? "Hide" : "Show"} advanced metrics
            </button>
            {showAdvanced && (
              <div style={{ marginTop: "0.75rem", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1rem" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem", fontFamily: "var(--font-mono)" }}>
                  Best model: {mlResults.best_model}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
                  {[["R²", r2], ["RMSE", fmt(bestMetrics.rmse)], ["MAE", fmt(bestMetrics.mae)], ["CV R²", bestMetrics.cv_r2]].map(([label, val]) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{label}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}>{val ?? "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trend chart */}
          {trend?.labels?.length > 0 && (
            <div className="card" style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                📈 Trend — {mlResults.target_column?.replace(/_/g, " ")}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: "1rem" }}>
                The flat line shows the overall average; spikes show variation across records.
              </p>
              <div style={{ height: 220 }}>
                <LineChart labels={trend.labels.map(String)} datasets={trendDatasets} />
              </div>
            </div>
          )}

          {/* Actual vs Predicted */}
          {predLabels.length > 0 && (
            <div className="card" style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                🎯 How Accurate Are the Predictions?
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: "1rem" }}>
                Purple = actual values, teal dots = what the model predicted. Closer they are, better the model.
              </p>
              <div style={{ height: 250 }}>
                <LineChart labels={predLabels} datasets={predDatasets} />
              </div>
            </div>
          )}

          {/* Feature importance */}
          {topFeatures.length > 0 && (
            <div className="card" style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", marginBottom: "0.25rem" }}>
                🔑 What Influences {mlResults.target_column?.replace(/_/g, " ")} Most?
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: "1rem" }}>
                Longer bar = stronger influence on the prediction.
              </p>
              <div style={{ height: Math.max(140, topFeatures.length * 44) }}>
                <BarChart
                  labels={topFeatures.map(([k]) => k.replace(/_/g, " "))}
                  datasets={[{
                    label: "Influence %",
                    data: topFeatures.map(([, v]) => v),
                    backgroundColor: topFeatures.map((_, i) => `hsl(${170 - i * 16}, 70%, ${52 + i * 2}%)`),
                    borderRadius: 4,
                  }]}
                  horizontal
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Numeric column stats */}
      {colStats.length > 0 && (
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", marginBottom: "1rem" }}>
            📋 Column Statistics
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr><th>Column</th><th>Average</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th></tr>
              </thead>
              <tbody>
                {colStats.map(col => (
                  <tr key={col.name}>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "0.8rem" }}>{col.name.replace(/_/g, " ")}</td>
                    <td><strong>{fmt(col.mean)}</strong></td>
                    <td>{fmt(col.median)}</td>
                    <td>{fmt(col.std)}</td>
                    <td>{fmt(col.min)}</td>
                    <td>{fmt(col.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No ML yet */}
      {!mlResults && !runningML && (
        <div style={{ border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)", padding: "3rem", textAlign: "center", marginTop: "1rem" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Click below to automatically analyse your data, detect patterns, and generate predictions.
          </p>
          <button className="btn btn-primary" onClick={runML} style={{ fontSize: "1rem", padding: "0.8rem 2rem" }}>
            ▶ Analyse Data
          </button>
        </div>
      )}
    </div>
  );
}
