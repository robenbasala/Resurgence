import { apiClient } from "./apiClient";

export async function fetchMe() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}
