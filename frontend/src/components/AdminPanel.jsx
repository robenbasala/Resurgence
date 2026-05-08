import { useEffect, useMemo, useState } from "react";
import {
  createInvite,
  fetchAdminFacilities,
  fetchAdminUsers,
  fetchInvites,
  updateUserFacilities
} from "../api/adminApi";

export default function AdminPanel() {
  const [facilities, setFacilities] = useState([]);
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const facilityMap = useMemo(() => {
    const map = new Map();
    facilities.forEach((f) => map.set(Number(f.id), f.label));
    return map;
  }, [facilities]);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const [f, u, i] = await Promise.all([fetchAdminFacilities(), fetchAdminUsers(), fetchInvites()]);
      setFacilities(Array.isArray(f.facilities) ? f.facilities : []);
      setUsers(Array.isArray(u.users) ? u.users : []);
      setInvites(Array.isArray(i.invites) ? i.invites : []);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const toggleFacility = (id) => {
    const n = Number(id);
    setSelectedFacilities((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const onCreateInvite = async (e) => {
    e.preventDefault();
    setError("");
    setInviteLink("");
    try {
      const data = await createInvite({
        email: String(email || "").trim().toLowerCase(),
        facilityIds: selectedFacilities
      });
      setInviteLink(data.inviteUrl || "");
      setEmail("");
      setSelectedFacilities([]);
      await reload();
    } catch (e2) {
      setError(e2?.response?.data?.error?.message || e2?.message || "Failed to create invite.");
    }
  };

  const onSaveUser = async (user) => {
    try {
      await updateUserFacilities({
        uid: user.uid,
        email: user.email,
        facilityIds: user.facilities
      });
      await reload();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to save user facilities.");
    }
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Admin Panel</h2>
      <p className="mt-0.5 text-xs text-slate-500">Invite-only signup and facility access management.</p>
      {error ? <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</p> : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-700">Create Invite</h3>
          <form className="mt-2 space-y-2" onSubmit={onCreateInvite}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full rounded border border-slate-300 px-2.5 py-2 text-sm"
            />
            <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-slate-200 p-2">
              {facilities.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedFacilities.includes(Number(f.id))}
                    onChange={() => toggleFacility(f.id)}
                  />
                  {f.label} ({f.id})
                </label>
              ))}
            </div>
            <button className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              Create Invite Link
            </button>
          </form>
          {inviteLink ? (
            <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 p-2">
              <p className="text-xs font-medium text-emerald-800">Invite link:</p>
              <p className="break-all text-xs text-emerald-700">{inviteLink}</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-700">Recent Invites</h3>
          <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto text-xs">
            {invites.map((inv) => (
              <li key={inv.token} className="rounded border border-slate-200 bg-slate-50 p-2 text-slate-700">
                <div>{inv.email}</div>
                <div className="text-slate-500">
                  {inv.facilityIds.map((id) => facilityMap.get(Number(id)) || id).join(", ")}
                </div>
                <div className="text-slate-400">{inv.acceptedAt ? "Accepted" : "Pending"}</div>
              </li>
            ))}
            {invites.length === 0 ? <li className="text-slate-500">No invites yet.</li> : null}
          </ul>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-slate-200 p-3">
        <h3 className="text-sm font-semibold text-slate-700">Users & Facility Access</h3>
        {loading ? <p className="mt-2 text-xs text-slate-500">Loading...</p> : null}
        <div className="mt-2 space-y-2">
          {users.map((user) => (
            <div key={user.uid} className="rounded border border-slate-200 p-2">
              <p className="text-xs font-medium text-slate-800">{user.email || user.uid}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {facilities.map((f) => {
                  const checked = (user.facilities || []).includes(Number(f.id));
                  return (
                    <label key={`${user.uid}-${f.id}`} className="flex items-center gap-1 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setUsers((prev) =>
                            prev.map((u) =>
                              u.uid !== user.uid
                                ? u
                                : {
                                    ...u,
                                    facilities: checked
                                      ? u.facilities.filter((id) => Number(id) !== Number(f.id))
                                      : [...u.facilities, Number(f.id)]
                                  }
                            )
                          );
                        }}
                      />
                      {f.label}
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => onSaveUser(user)}
                className="mt-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Save Access
              </button>
            </div>
          ))}
          {!loading && users.length === 0 ? <p className="text-xs text-slate-500">No users with access yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
