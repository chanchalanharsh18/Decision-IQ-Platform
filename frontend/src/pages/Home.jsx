import React from "react";

const FEATURES = [
  {
    icon: "⬆",
    title: "Smart Dataset Upload",
    desc: "Drag-and-drop CSV or Excel files. We auto-detect column types, handle missing values, and profile your data instantly.",
    color: "var(--accent)",
  },
  {
    icon: "⚙",
    title: "Automated ML Pipeline",
    desc: "Linear Regression and Random Forest models train automatically. Zero configuration — just upload and predict.",
    color: "var(--accent-2)",
  },
  {
    icon: "✦",
    title: "AI-Powered Insights",
    desc: "Google Gemini analyses your predictions and generates executive-grade business recommendations.",
    color: "#f59e0b",
  },
  {
    icon: "◈",
    title: "Interactive Dashboard",
    desc: "Real-time Chart.js visualisations: trend lines, prediction charts, feature importance, and anomaly flags.",
    color: "#ff7eb6",
  },
];

const STEPS = [
  { n: "01", label: "Upload Dataset" },
  { n: "02", label: "Process & Profile" },
  { n: "03", label: "Train ML Models" },
  { n: "04", label: "Generate Insights" },
  { n: "05", label: "Explore Dashboard" },
];

export function Home({ navigate }) {
  return (
    <div>
      {/* Hero */}
      <section style={{
        maxWidth: 1200, margin: "0 auto", padding: "6rem 2rem 4rem",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center",
      }}>
        <div className="fade-up">
          <div className="badge badge-accent" style={{ marginBottom: "1.25rem" }}>
            Powered by Gemini + Scikit-learn
          </div>
          <h1 style={{ fontSize: "clamp(2.2rem, 4vw, 3.5rem)", marginBottom: "1.25rem", lineHeight: 1.1 }}>
            Turn Raw Data Into{" "}
            <span style={{
              background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Decision Intelligence</span>
          </h1>
          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "2rem", maxWidth: 480 }}>
            Upload any dataset. Our platform automatically profiles it, trains machine learning models,
            and generates actionable business insights — in minutes, not months.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => navigate("upload")}
              style={{ fontSize: "0.95rem", padding: "0.75rem 1.75rem" }}>
              Get Started Free →
            </button>
            <button className="btn btn-secondary" onClick={() => navigate("dashboard")}
              style={{ fontSize: "0.95rem", padding: "0.75rem 1.75rem" }}>
              View Demo Dashboard
            </button>
          </div>
          <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Supports CSV · Excel · No code required
          </p>
        </div>

        {/* Hero graphic */}
        <div className="fade-up fade-up-2" style={{ position: "relative" }}>
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "1.5rem",
            boxShadow: "var(--shadow-glow)",
          }}>
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem" }}>
              {[{ label: "Accuracy", val: "94.2%", color: "var(--accent)" },
                { label: "R² Score", val: "0.89", color: "var(--accent-2)" },
                { label: "Rows", val: "12,450", color: "#f59e0b" }].map(s => (
                <div key={s.label} style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", fontWeight: 800, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
            {/* Fake sparkline */}
            <svg viewBox="0 0 300 80" style={{ width: "100%", height: 80 }}>
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,60 C30,55 60,20 90,30 C120,40 150,10 180,15 C210,20 240,35 300,10"
                fill="none" stroke="var(--accent)" strokeWidth="2" />
              <path d="M0,60 C30,55 60,20 90,30 C120,40 150,10 180,15 C210,20 240,35 300,10 L300,80 L0,80 Z"
                fill="url(#lg)" />
              <path d="M0,70 C40,65 80,55 120,48 C160,41 200,50 300,35"
                fill="none" stroke="var(--accent-2)" strokeWidth="1.5" strokeDasharray="4,4" />
            </svg>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <span className="badge badge-accent">Predicted</span>
              <span className="badge badge-purple">Actual</span>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Revenue Model · Q4 2024
              </span>
            </div>
          </div>
          <div style={{
            position: "absolute", top: -20, right: -20, zIndex: -1,
            width: 200, height: 200, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,108,255,0.15), transparent 70%)",
            pointerEvents: "none",
          }} />
        </div>
      </section>

      {/* Pipeline steps */}
      <section style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "2rem 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem", display: "flex", gap: "0", overflowX: "auto" }}>
          {STEPS.map((step, i) => (
            <div key={step.n} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 140 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.75rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--accent)" }}>{step.n}</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.8rem", textAlign: "center", color: "var(--text-primary)" }}>{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: "var(--border)", minWidth: 16 }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="section">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 className="section-title" style={{ fontSize: "2rem" }}>Everything You Need</h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>
            A complete end-to-end intelligence pipeline, from raw upload to board-ready insights.
          </p>
        </div>
        <div className="grid-2">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`card fade-up fade-up-${i + 1}`} style={{ display: "flex", gap: "1rem" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "var(--radius-sm)", flexShrink: 0,
                background: `${f.color}18`, border: `1px solid ${f.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem",
              }}>{f.icon}</div>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem", marginBottom: "0.35rem" }}>{f.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ maxWidth: 1200, margin: "0 auto 4rem", padding: "0 2rem" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(0,217,170,0.1), rgba(124,108,255,0.1))",
          border: "1px solid var(--border-glow)", borderRadius: "var(--radius-lg)",
          padding: "3rem", textAlign: "center",
        }}>
          <h2 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>Ready to unlock your data?</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>Upload your first dataset and get ML-powered insights in under 60 seconds.</p>
          <button className="btn btn-primary" onClick={() => navigate("upload")}
            style={{ fontSize: "1rem", padding: "0.8rem 2rem" }}>
            Upload Your Dataset →
          </button>
        </div>
      </section>
    </div>
  );
}
