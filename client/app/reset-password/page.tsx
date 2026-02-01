"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Lock,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  BadgeCheck,
} from "lucide-react";

export default function ResetPasswordPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [msg, setMsg] = useState("");
  const [type, setType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(false);

  const tokenOk = useMemo(() => !!token && token.length > 10, [token]);

  const passStrength = useMemo(() => {
    const p = password;
    const hasLen = p.length >= 8;
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasNum = /[0-9]/.test(p);
    const hasSpecial = /[^A-Za-z0-9]/.test(p);

    const score = [hasLen, hasUpper, hasLower, hasNum, hasSpecial].filter(
      Boolean,
    ).length;

    return {
      score,
      hasLen,
      hasUpper,
      hasLower,
      hasNum,
      hasSpecial,
      label:
        score <= 2
          ? "Weak"
          : score === 3
            ? "Medium"
            : score === 4
              ? "Strong"
              : "Very strong",
      percent: Math.min(100, Math.round((score / 5) * 100)),
    };
  }, [password]);

  useEffect(() => {
    if (!tokenOk) {
      setMsg("Invalid or expired reset link.");
      setType("error");
    }
  }, [tokenOk]);

  const submit = async () => {
    if (!tokenOk) {
      setMsg("Invalid reset token.");
      setType("error");
      return;
    }

    if (!password.trim() || password.length < 6) {
      setMsg("Password must be at least 6 characters.");
      setType("error");
      return;
    }

    if (password !== confirm) {
      setMsg("Passwords do not match.");
      setType("error");
      return;
    }

    setLoading(true);
    setMsg("");
    setType("");

    try {
      const res = await api.post("/auth/reset-password", { token, password });
      setMsg(res.data?.msg || "Password reset successful.");
      setType("success");

      setTimeout(() => router.push("/login"), 1400);
    } catch (err: any) {
      setMsg(err?.response?.data?.msg || "Reset failed.");
      setType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      {/* Background */}
      <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute -bottom-44 -left-44 h-[32rem] w-[32rem] rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-12 lg:items-center">
          {/* LEFT */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="h-12 w-12 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-lg dark:bg-white dark:text-slate-900">
                P
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  PocketLancer
                </p>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  Secure reset
                </p>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Reset your password
            </h1>

            <p className="text-base font-bold text-slate-600 dark:text-slate-300 max-w-xl">
              Choose a strong password so your PocketLancer account stays safe.
            </p>

            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <ShieldCheck size={16} className="text-emerald-500" />
                Security tip
              </p>
              <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Use at least 8 characters and include numbers + symbols.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-black text-slate-700 hover:underline dark:text-slate-200"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>

          {/* RIGHT: Card */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-950">
              {/* header */}
              <div className="border-b border-slate-200 px-7 py-6 dark:border-white/10">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Reset Password
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  Set a new password
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                  {tokenOk
                    ? "Your reset link is valid."
                    : "Reset link is invalid or expired."}
                </p>
              </div>

              {/* body */}
              <div className="px-7 py-6 space-y-5">
                {/* Password */}
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    New password
                  </label>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                    <Lock size={18} className="text-slate-400" />

                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter a new password"
                      className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                      title={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                      <span>Password strength</span>
                      <span>{passStrength.label}</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden dark:bg-slate-900">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${passStrength.percent}%` }}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
                      <Req ok={passStrength.hasLen} text="8+ chars" />
                      <Req ok={passStrength.hasUpper} text="Uppercase" />
                      <Req ok={passStrength.hasLower} text="Lowercase" />
                      <Req ok={passStrength.hasNum} text="Number" />
                      <Req ok={passStrength.hasSpecial} text="Symbol" />
                    </div>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Confirm password
                  </label>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                    <Lock size={18} className="text-slate-400" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                      title={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Message */}
                {msg && (
                  <div
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm font-bold",
                      type === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                        : "border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-200",
                    ].join(" ")}
                  >
                    {msg}
                  </div>
                )}

                {/* CTA */}
                <button
                  type="button"
                  disabled={loading || !tokenOk}
                  onClick={submit}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    <>
                      Reset Password <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>

              {/* bottom */}
              <div className="border-t border-slate-200 px-7 py-6 dark:border-white/10">
                <p className="inline-flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                  <BadgeCheck size={16} className="text-blue-500" />
                  Once reset is done, you’ll be redirected to login.
                </p>
              </div>
            </div>
          </div>
          {/* end */}
        </div>
      </div>
    </div>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-black/5",
        ok
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
      ].join(" ")}
    >
      <span
        className={[
          "h-2.5 w-2.5 rounded-full",
          ok ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700",
        ].join(" ")}
      />
      <span className="text-xs font-black">{text}</span>
    </div>
  );
}
