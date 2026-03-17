/**
 * API Client — centralised fetch wrappers for all backend endpoints.
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

export const api = {
  /** Upload a CSV/Excel file. Returns dataset metadata + summary. */
  uploadDataset(file) {
    const form = new FormData();
    form.append("file", file);
    return request("/upload-dataset", { method: "POST", body: form });
  },

  /** Return all uploaded datasets. */
  listDatasets() {
    return request("/datasets");
  },

  /** Get full summary for one dataset. */
  getDatasetSummary(datasetId) {
    return request(`/dataset-summary?dataset_id=${datasetId}`);
  },

  /** Run ML pipeline. Optional targetColumn. */
  runML(datasetId, targetColumn = null) {
    const qs = `dataset_id=${datasetId}${targetColumn ? `&target_column=${encodeURIComponent(targetColumn)}` : ""}`;
    return request(`/run-ml?${qs}`, { method: "POST" });
  },

  /** Get stored ML predictions for a dataset. */
  getPredictions(datasetId) {
    return request(`/predictions?dataset_id=${datasetId}`);
  },

  /** Trigger AI insight generation (requires ML results). */
  generateInsights(datasetId) {
    return request(`/generate-insights?dataset_id=${datasetId}`, { method: "POST" });
  },

  /** Get stored AI insights. */
  getInsights(datasetId) {
    return request(`/insights?dataset_id=${datasetId}`);
  },

  /** Delete a dataset. */
  deleteDataset(datasetId) {
    return request(`/datasets/${datasetId}`, { method: "DELETE" });
  },
};
