import { useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../firebaseClient";
import { acceptInvite, fetchInvite } from "../api/adminApi";

function useInviteToken() {
  return useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get("invite") || "";
  }, []);
}

export default function InviteSignupScreen() {
  const inviteToken = useInviteToken();
  const [invite, setInvite] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Loading invite...");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      if (!inviteToken) {
        setError("Invite token is missing.");
        setStatus("");
        return;
      }
      try {
        const data = await fetchInvite(inviteToken);
        setInvite(data);
        setEmail(data.email || "");
        setStatus("");
      } catch (e) {
        setError(e?.response?.data?.error?.message || e?.message || "Invalid invite.");
        setStatus("");
      }
    }
    loadInvite();
  }, [inviteToken]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!invite) return;
    if (String(email).trim().toLowerCase() !== String(invite.email).trim().toLowerCase()) {
      setError("Email must match invite email.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await acceptInvite(inviteToken);
      setCompleted(true);
      setStatus("Signup successful. Redirecting to login...");
      await signOut(auth);
      setTimeout(() => {
        window.location.replace("/");
      }, 1200);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e?.message || "Failed to complete signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 10% 15%, rgba(56,189,248,0.18), transparent 40%), radial-gradient(circle at 85% 8%, rgba(99,102,241,0.18), transparent 42%), radial-gradient(circle at 50% 100%, rgba(16,185,129,0.1), transparent 45%)"
        }}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_70px_-24px_rgba(15,23,42,0.35)] backdrop-blur-md">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Complete Your Signup</h1>
          <p className="mt-1 text-sm text-slate-500">Your access is invite-only and tied to your email.</p>
        </div>

        {status ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{status}</p>
        ) : null}
        {error ? (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {invite && !completed ? (
          <form className="mt-4 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="Email"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="Create password"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="Confirm password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50"
            >
              {loading ? "Completing..." : "Complete Signup"}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
