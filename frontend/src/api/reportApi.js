import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 120000)
});

export async function fetchReport(params) {
  const { data } = await api.get("/report", { params });
  return data;
}

export async function fetchReportMeta() {
  const { data } = await api.get("/report/meta");
  return data;
}
