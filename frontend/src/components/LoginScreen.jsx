import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseClient";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err?.message || "Login failed.");
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
            "radial-gradient(circle at 15% 20%, rgba(99,102,241,0.18), transparent 38%), radial-gradient(circle at 85% 12%, rgba(56,189,248,0.15), transparent 40%), radial-gradient(circle at 50% 100%, rgba(16,185,129,0.12), transparent 45%)"
        }}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-white/60 bg-white/90 p-6 shadow-[0_20px_70px_-24px_rgba(15,23,42,0.4)] backdrop-blur-md">
        <div className="mb-5 flex flex-col items-center">
          <div className="rounded-xl bg-slate-900 px-4 py-2 text-xl font-bold tracking-tight text-white">
            <span className="text-cyan-300">Resur</span>gence
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Welcome Back</h1>
          <p className="mt-1 text-center text-sm text-slate-500">Sign in to access your analytics dashboard</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Email address</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              disabled={loading}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              disabled={loading}
            />
          </div>

          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center">
          <button
            type="button"
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            disabled
            title="Coming soon"
          >
            Forgot your password?
          </button>
          <div className="h-px bg-slate-200" />
          <button
            type="button"
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            disabled
            title="Coming soon"
          >
            Request Account Access
          </button>
          <p className="text-[11px] text-slate-400">Secure authentication via Firebase</p>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 text-center text-[11px] text-slate-400">
        Protected by enterprise-grade security
      </div>
    </main>
  );
}
