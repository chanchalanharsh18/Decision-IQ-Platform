import React, { useState, useEffect } from "react";
import { api } from "../utils/api";

function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^#{1}\s+(.+)$/gm, '<h1 style="font-family:var(--font-display);font-size:1.5rem;margin:1.5rem 0 0.5rem;color:var(--text-primary)">$1</h1>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2 style="font-family:var(--font-display);font-size:1.15rem;margin:1.25rem 0 0.4rem;color:var(--text-primary)">$1</h2>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3 style="font-family:var(--font-display);font-size:1rem;margin:1rem 0 0.3rem;color:var(--text-secondary)">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent)">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:var(--text-secondary)">$1</em>')
    .replace(/^[-*]\s+(.+)$/gm, '<li style="margin:0.35rem 0;padding-left:1rem;color:var(--text-primary);list-style:none;position:relative"><span style="position:absolute;left:0;color:var(--accent)">◆</span>$1</li>')
    .replace(/`(.+?)`/g, '<code style="font-family:var(--font-mono);background:var(--bg-elevated);padding:0.1em 0.35em;border-radius:4px;font-size:0.85em;color:var(--accent)">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin:0.75rem 0;color:var(--text-secondary);line-height:1.7">')
    .replace(/\n/g, "<br/>");
}

const LOADING_STEPS = [
  "Analysing dataset summary…",
  "Loading ML predictions…",
  "Crafting Gemini prompt…",
  "Generating business insights…",
  "Formatting recommendations…",
];

export function InsightsPage({ dataset, navigate }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Try to load existing insights on mount
  useEffect(() => {
    if (!dataset?.id) return;
    api.getInsights(dataset.id).then(setInsights).catch(() => {});
  }, [dataset?.id]);

  // Cycle loading steps
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setStepIdx(i => (i + 1) % LOADING_STEPS.length), 2200);
    return () => clearInterval(id);
  }, [loading]);

  const generate = async () => {
    setLoading(true); setError(null); setStepIdx(0);
    try {
      const data = await api.generateInsights(dataset.id);
      setInsights(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(insights?.insight_text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!dataset) {
    return (
      <div className="section" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>No dataset loaded. Please upload a dataset first.</p>
        <button className="btn btn-primary" onClick={() => navigate("upload")}>Upload Dataset →</button>
      </div>
    );
  }

  return (
    <div className="section fade-up" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div className="badge badge-purple" style={{ marginBottom: "0.5rem" }}>✦ AI Insights</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem" }}>Data Analysis Report</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{dataset.name}</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-secondary" onClick={() => navigate("dashboard", dataset)}>← Dashboard</button>
          {insights && (
            <button className="btn btn-secondary" onClick={copyText}>
              {copied ? "✓ Copied" : "Copy Text"}
            </button>
          )}
          <button className="btn btn-ghost" onClick={generate} disabled={loading}>
            {loading ? "Generating…" : insights ? "↺ Regenerate" : "✦ Generate Insights"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
          ⚠ {error}
          <br /><small style={{ opacity: 0.8, marginTop: "0.25rem", display: "block" }}>
            Tip: Make sure GEMINI_API_KEY is set in your .env file and the ML pipeline has been run.
          </small>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)", padding: "4rem 2rem", textAlign: "center",
        }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: "1.5rem" }}>
            <div className="spinner" style={{ width: 48, height: 48 }} />
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
              fontSize: "1.1rem",
            }}>✦</div>
          </div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--accent)", marginBottom: "0.5rem" }}>
            {LOADING_STEPS[stepIdx]}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Powered by Google Gemini · Usually takes 5–15 seconds
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !insights && !error && (
        <div style={{
          background: "var(--bg-surface)", border: "1px dashed var(--border)",
          borderRadius: "var(--radius-lg)", padding: "4rem 2rem", textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.4 }}>✦</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", marginBottom: "0.75rem" }}>
            No insights generated yet
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", maxWidth: 400, margin: "0 auto 2rem" }}>
            Click "Generate Insights" to have Google Gemini analyse your dataset and ML results,
            then produce a structured business intelligence report.
          </p>
          <button className="btn btn-primary" onClick={generate} style={{ fontSize: "1rem", padding: "0.8rem 1.75rem" }}>
            ✦ Generate AI Insights
          </button>
          <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Requires: dataset upload + ML pipeline run + GEMINI_API_KEY
          </p>
        </div>
      )}

      {/* Insights card */}
      {!loading && insights?.insight_text && (
        <div>
          {/* Meta bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1.25rem",
            background: "var(--bg-elevated)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", marginBottom: "1.5rem", flexWrap: "wrap",
          }}>
            <span className="badge badge-accent">✦ Gemini AI</span>
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
              {insights.created_at ? new Date(insights.created_at).toLocaleString() : "Just generated"}
            </span>
            <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {insights.insight_text.split(" ").length} words
            </span>
          </div>

          <div className="card" style={{ lineHeight: 1.75, padding: "2rem" }}>
            <div
              dangerouslySetInnerHTML={{ __html: `<p style="margin:0.75rem 0;color:var(--text-secondary);line-height:1.7">${renderMarkdown(insights.insight_text)}</p>` }}
            />
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={copyText}>
              {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
            </button>
            <button className="btn btn-secondary" onClick={generate} disabled={loading}>
              ↺ Regenerate Insights
            </button>
            <button className="btn btn-secondary" onClick={() => navigate("dashboard", dataset)}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
