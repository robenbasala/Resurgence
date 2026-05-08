import axios from "axios";
import { auth } from "../firebaseClient";

const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 120000);

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: DEFAULT_TIMEOUT_MS
});

apiClient.interceptors.request.use((config) => {
  return config;
});

apiClient.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return config;
  const token = await currentUser.getIdToken();
  config.headers = config.headers || {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
