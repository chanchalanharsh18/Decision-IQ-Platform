import React from "react";

export function Navbar({ currentPage, navigate }) {
  const navItems = [
    { id: "home", label: "Home" },
    { id: "upload", label: "Upload" },
    { id: "dashboard", label: "Dashboard" },
    { id: "insights", label: "AI Insights" },
  ];

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(8,12,20,0.85)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--border)",
      padding: "0 2rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: "60px",
    }}>
      {/* Logo */}
      <button onClick={() => navigate("home")} style={{
        background: "none", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: "0.6rem",
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.7rem", fontWeight: 800, color: "#080c14",
          fontFamily: "var(--font-display)"
        }}>AI</span>
        <span style={{
          fontFamily: "var(--font-display)", fontWeight: 700,
          fontSize: "1rem", color: "var(--text-primary)"
        }}>DecisionIQ</span>
      </button>

      {/* Nav links */}
      <div style={{ display: "flex", gap: "0.25rem" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => navigate(item.id)} style={{
            background: currentPage === item.id ? "var(--accent-dim)" : "none",
            border: "none", cursor: "pointer",
            padding: "0.4rem 0.9rem", borderRadius: "var(--radius-sm)",
            color: currentPage === item.id ? "var(--accent)" : "var(--text-secondary)",
            fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.875rem",
            transition: "all 0.2s",
          }}>{item.label}</button>
        ))}
      </div>

      {/* CTA */}
      <button className="btn btn-primary" onClick={() => navigate("upload")}
        style={{ fontSize: "0.8rem", padding: "0.45rem 1rem" }}>
        + Upload Dataset
      </button>
    </nav>
  );
}
