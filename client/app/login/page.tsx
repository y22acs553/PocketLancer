"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Guard:
   * If user is already logged in, they should NEVER stay on /login
   */
  useEffect(() => {
    if (!userLoading && user) {
      router.replace("/dashboard");
    }
  }, [userLoading, user, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Backend sets HttpOnly JWT cookie here
      await api.post("/auth/login", {
        email,
        password,
      });

      /**
       * IMPORTANT:
       * Use HARD redirect so UserContext remounts
       * and re-checks /auth/check-session with cookie.
       */
      window.location.href = "/dashboard";
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Prevent flicker while session is being checked
   */
  if (userLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Checking session…
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <form
        onSubmit={handleLoginSubmit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-900">
          Login
        </h1>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900
                       focus:border-brand-primary focus:outline-none
                       focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900
                       focus:border-brand-primary focus:outline-none
                       focus:ring-2 focus:ring-brand-primary/30"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-primary px-4 py-2
                     font-semibold text-white transition
                     hover:bg-blue-600 disabled:cursor-not-allowed
                     disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Login"}
        </button>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}
      </form>
    </div>
  );
}
