import React, { useState, useRef, useCallback } from "react";
import { api } from "../utils/api";

export function UploadPage({ navigate, onDatasetReady }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFile = useCallback((f) => {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      setError("Only CSV and Excel (.xlsx/.xls) files are supported.");
      return;
    }
    setError(null);
    setFile(f);
    setResult(null);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const upload = async () => {
    if (!file) return;
    setUploading(true); setError(null);
    try {
      const data = await api.uploadDataset(file);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const proceed = () => {
    if (!result) return;
    onDatasetReady({ id: result.dataset_id, name: result.original_name, summary: result.summary });
  };

  const summary = result?.summary;
  const sampleData = summary?.sample_data || [];
  const columns = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];

  return (
    <div className="section" style={{ maxWidth: 860 }}>
      <div className="fade-up">
        <div className="badge badge-accent" style={{ marginBottom: "1rem" }}>Step 1 of 3</div>
        <h1 className="section-title" style={{ fontSize: "2rem" }}>Upload Your Dataset</h1>
        <p className="section-subtitle">Drag & drop or browse a CSV / Excel file (max 50 MB)</p>
      </div>

      {/* Dropzone */}
      <div className="fade-up fade-up-1"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--accent)" : file ? "var(--border-glow)" : "var(--border)"}`,
          borderRadius: "var(--radius-lg)", padding: "3.5rem 2rem",
          textAlign: "center", cursor: "pointer",
          background: dragging ? "var(--accent-dim)" : "var(--bg-surface)",
          transition: "all 0.2s",
          marginBottom: "1.5rem",
        }}>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls"
          style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />

        {file ? (
          <div>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>✓</div>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent)", fontSize: "1.1rem" }}>{file.name}</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem", opacity: 0.4 }}>⬆</div>
            <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1rem" }}>Drop your file here</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.4rem" }}>or click to browse</p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1rem" }}>
              {["CSV", "XLSX", "XLS"].map(ext => (
                <span key={ext} className="badge badge-purple">{ext}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error fade-up" style={{ marginBottom: "1rem" }}>⚠ {error}</div>}

      {file && !result && (
        <div className="fade-up" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginBottom: "2rem" }}>
          <button className="btn btn-secondary" onClick={() => setFile(null)}>Clear</button>
          <button className="btn btn-primary" onClick={upload} disabled={uploading}>
            {uploading ? "Processing…" : "Upload & Process →"}
          </button>
        </div>
      )}

      {uploading && (
        <div className="loading-center fade-up">
          <div className="spinner" />
          <p>Uploading and profiling your dataset…</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Detecting column types · Handling missing values · Generating summary
          </p>
        </div>
      )}

      {/* Summary cards after upload */}
      {result && summary && (
        <div className="fade-up">
          <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
            ✓ Dataset uploaded successfully — {summary.row_count?.toLocaleString()} rows processed
          </div>

          {/* Stat row */}
          <div className="grid-4" style={{ marginBottom: "1.5rem" }}>
            {[
              { label: "Rows", value: summary.row_count >= 1000 ? (summary.row_count / 1000).toFixed(0) + "k" : summary.row_count?.toLocaleString() },
              { label: "Columns", value: summary.column_count },
              { label: "Duplicates Removed", value: summary.duplicates_removed },
              { label: "Missing Cols", value: Object.keys(summary.missing_value_stats || {}).length },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-card__label">{s.label}</div>
                <div className="stat-card__value" style={{ fontSize: "clamp(1.2rem, 3vw, 2rem)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Column types */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>Column Types Detected</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {Object.entries(summary.column_types || {}).map(([col, type]) => (
                <span key={col} className={`badge ${type === "numeric" ? "badge-accent" : type === "datetime" ? "badge-warning" : "badge-purple"}`}>
                  {col} · {type}
                </span>
              ))}
            </div>
          </div>

          {/* Data preview table */}
          {sampleData.length > 0 && (
            <div className="card" style={{ marginBottom: "1.5rem", overflowX: "auto" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", marginBottom: "0.75rem" }}>
                Data Preview (first {sampleData.length} rows)
              </h3>
              <table className="data-table">
                <thead>
                  <tr>{columns.slice(0, 8).map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {sampleData.slice(0, 8).map((row, i) => (
                    <tr key={i}>
                      {columns.slice(0, 8).map(c => (
                        <td key={c} style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row[c] === null || row[c] === undefined ? (
                            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>null</span>
                          ) : String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {columns.length > 8 && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  + {columns.length - 8} more columns
                </p>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => { setFile(null); setResult(null); }}>
              Upload Another
            </button>
            <button className="btn btn-primary" onClick={proceed}>
              Go to Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
