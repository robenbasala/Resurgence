import axios from "axios";

/** Default for meta / cell-details (fast endpoints). */
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 120000);
/**
 * Report query can run a heavy view over a month range; 2 minutes is often too short.
 * Override with VITE_REPORT_TIMEOUT_MS (e.g. 900000 for 15 minutes).
 */
const REPORT_TIMEOUT_MS = Number(import.meta.env.VITE_REPORT_TIMEOUT_MS || 600000);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: DEFAULT_TIMEOUT_MS
});

export async function fetchReport(params) {
  const { data } = await api.get("/report", { params, timeout: REPORT_TIMEOUT_MS });
  return data;
}

export async function fetchReportMeta() {
  const { data } = await api.get("/report/meta");
  return data;
}

export async function fetchCellDetails({ mrNumber, date }) {
  const { data } = await api.get("/report/cell-details", {
    params: { mrNumber, date }
  });
  return data;
}

/** Same query params as /report — returns { annotations: { [cellKey]: { completed, notes } } } */
export async function fetchCellAnnotations(params) {
  const { data } = await api.get("/report/cell-annotations", { params, timeout: REPORT_TIMEOUT_MS });
  return data;
}

export async function saveCellAnnotation(payload) {
  const { data } = await api.put("/report/cell-annotations", payload, { timeout: DEFAULT_TIMEOUT_MS });
  return data;
}
