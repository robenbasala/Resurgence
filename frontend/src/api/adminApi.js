import { apiClient } from "./apiClient";

export async function fetchAdminFacilities() {
  const { data } = await apiClient.get("/admin/facilities");
  return data;
}

export async function fetchAdminUsers() {
  const { data } = await apiClient.get("/admin/users");
  return data;
}

export async function updateUserFacilities({ uid, email, facilityIds }) {
  const { data } = await apiClient.put(`/admin/users/${encodeURIComponent(uid)}/facilities`, {
    email,
    facilityIds
  });
  return data;
}

export async function createInvite({ email, facilityIds, expiresInDays = 7 }) {
  const { data } = await apiClient.post("/admin/invites", {
    email,
    facilityIds,
    expiresInDays
  });
  return data;
}

export async function fetchInvites() {
  const { data } = await apiClient.get("/admin/invites");
  return data;
}

export async function fetchInvite(token) {
  const { data } = await apiClient.get(`/auth/invite/${encodeURIComponent(token)}`);
  return data;
}

export async function acceptInvite(inviteToken) {
  const { data } = await apiClient.post("/auth/invite/accept", { inviteToken });
  return data;
}
