// client/app/dashboard/freelancer/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import GetLocationButton from "@/components/GetLocationButton";
import { useUser } from "@/context/UserContext";
import {
  Loader2,
  CalendarCheck2,
  Star,
  TrendingUp,
  User,
  ArrowRight,
  BadgeCheck,
  MapPin,
  Briefcase,
  CheckCircle,
  XCircle,
  ClipboardList,
  Shield,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "pending_approval"
  | "completed"
  | "cancelled"
  | "disputed";

type Booking = {
  _id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: BookingStatus;
  serviceCategory?: "field" | "digital";
  deadline?: string;
  autoReleaseAt?: string;
};

type Profile = {
  _id?: string;
  title?: string;
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  city?: string;
  country?: string;
  profilePic?: string;
  category?: string;
  location?: { type: "Point"; coordinates: number[] };
  portfolio?: string[];
  pastWorks?: any[];
};

// ── Honor score helpers ────────────────────────────────────────────
function honorLabel(score: number) {
  if (score < 35) return "Low Trust";
  if (score < 75) return "Average";
  return "Trusted";
}

function honorColors(score: number) {
  if (score < 35)
    return {
      bar: "bg-red-500",
      card: "from-red-950 to-slate-900",
      icon: "bg-red-500/20 text-red-300 ring-red-500/30",
      text: "text-red-300",
      tip: "Raise your score by completing all bookings reliably.",
    };
  if (score < 75)
    return {
      bar: "bg-orange-400",
      card: "from-orange-950 to-slate-900",
      icon: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
      text: "text-orange-300",
      tip: "Keep completing bookings on time to reach Trusted status.",
    };
  return {
    bar: "bg-emerald-500",
    card: "from-emerald-950 to-slate-900",
    icon: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
    text: "text-emerald-300",
    tip: "Great work! Every clean booking adds +2 to your score.",
  };
}

// ── Score history pill ─────────────────────────────────────────────
const SCORE_EVENTS = [
  { event: "Clean completion", change: "+2", color: "text-emerald-400" },
  { event: "Missed arrival", change: "−5", color: "text-orange-400" },
  { event: "Missed deadline", change: "−5", color: "text-orange-400" },
  { event: "Cancelled confirmed job", change: "−5", color: "text-orange-400" },
  {
    event: "Dispute resolved against you",
    change: "−10",
    color: "text-red-400",
  },
];

export default function FreelancerDashboard() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const score = user?.honorScore ?? 100;
  const hc = honorColors(score);

  const card =
    "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10";

  // ── Load data ──────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([api.get("/bookings/mybookings"), api.get("/freelancers/me")])
      .then(([bRes, pRes]) => {
        setBookings(bRes.data?.data || []);
        setProfile(pRes.data?.profile || null);
      })
      .catch(() => {
        setBookings([]);
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ── Derived stats ──────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      total: bookings.length,
      completed: bookings.filter((b) => b.status === "completed").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      pending: bookings.filter((b) => b.status === "pending").length,
    }),
    [bookings],
  );

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings],
  );

  const confirmedBookings = useMemo(
    () =>
      bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status)),
    [bookings],
  );

  const profileCompletion = useMemo(() => {
    if (!profile) return { percent: 0, missing: [] as string[] };
    const missing: string[] = [];
    if (!profile.title) missing.push("Professional title");
    if (!profile.bio) missing.push("Bio");
    if (!profile.skills || profile.skills.length < 5) missing.push("5+ skills");
    if (!profile.portfolio || profile.portfolio.length < 2)
      missing.push("Portfolio items");
    if (!profile.pastWorks || profile.pastWorks.length < 2)
      missing.push("Past works");
    if (!profile.profilePic) missing.push("Profile picture");
    const coords = profile.location?.coordinates || [];
    if (profile.category === "field" && coords.length !== 2)
      missing.push("GPS Location");
    const done = 7 - missing.length;
    return { percent: Math.round((done / 7) * 100), missing };
  }, [profile]);

  // ── Actions ────────────────────────────────────────────────────
  const updateStatus = async (
    bookingId: string,
    status: "confirmed" | "completed" | "cancelled",
  ) => {
    try {
      setActionLoading(`${bookingId}:${status}`);
      await api.patch(`/bookings/${bookingId}/status`, { status });
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status } : b)),
      );
      setToast(`Booking updated → ${status}`);
    } catch (err: any) {
      setToast(err?.response?.data?.msg || "Failed to update booking");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-600">
        <Loader2 className="animate-spin" size={24} /> Loading freelancer
        dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Welcome banner ── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-7 text-white shadow">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-300">Welcome back</p>
            <h2 className="mt-1 text-3xl font-black">
              {user?.name || "Freelancer"}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Manage bookings & keep your profile strong to get more clients.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/freelancer/profile")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 active:bg-slate-100"
            >
              <User size={16} /> Edit Profile
            </button>
            <button
              onClick={() => router.push("/freelancer/bookings")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-5 py-3 text-sm font-black text-white active:bg-white/10"
            >
              <CalendarCheck2 size={16} /> All Bookings
            </button>
          </div>
        </div>
      </div>

      {/* ── Honor Score + Stats ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {/* Honor Score card — 2 cols always, lg 2 of 5 */}
        <div
          className={`col-span-2 rounded-3xl bg-gradient-to-br p-6 text-white shadow ${hc.card}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Reliability Score
              </p>
              <p className="mt-2 text-5xl font-black">{score}</p>
              <p className={`mt-1 text-sm font-black ${hc.text}`}>
                {honorLabel(score)}
              </p>
            </div>
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${hc.icon}`}
            >
              <Shield size={22} />
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-[10px] font-black text-slate-500">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-700 ${hc.bar}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] font-bold text-slate-500">
              {hc.tip}
            </p>
          </div>
        </div>

        {/* Booking stats */}
        {[
          { label: "Total", value: stats.total },
          { label: "Confirmed", value: stats.confirmed },
          { label: "Pending", value: stats.pending },
        ].map((s) => (
          <div key={s.label} className={card}>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              {s.label}
            </p>
            <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Completed — full row */}
      <div className={card}>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Completed Bookings
        </p>
        <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
          {stats.completed}
        </p>
      </div>

      {/* ── Score rules panel ── */}
      <div className={`${card} border border-slate-100 dark:border-white/5`}>
        <h3 className="mb-3 font-black text-slate-900 dark:text-white">
          How Your Score Changes
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SCORE_EVENTS.map((e) => (
            <div
              key={e.event}
              className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800"
            >
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {e.event}
              </span>
              <span className={`text-sm font-black ${e.color}`}>
                {e.change}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Max score
            </span>
            <span className="text-sm font-black text-emerald-400">100</span>
          </div>
        </div>
      </div>

      {/* ── Requests + Profile ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT: Pending + Confirmed */}
        <div className="space-y-6 lg:col-span-7">
          {/* Pending Requests */}
          <div className={card}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                <ClipboardList size={18} /> Pending Requests
              </h3>
              <span className="text-xs font-black text-slate-500">
                {pendingBookings.length} pending
              </span>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-black/5 dark:bg-slate-800">
                <p className="font-black text-slate-700 dark:text-white">
                  No pending requests
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Requests from clients will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.slice(0, 6).map((b) => (
                  <div
                    key={b._id}
                    className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">
                        {b.serviceType}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(b.preferredDate).toLocaleDateString()} ·{" "}
                        {b.preferredTime}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(b._id, "confirmed")}
                        disabled={actionLoading === `${b._id}:confirmed`}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white active:bg-emerald-700 disabled:opacity-60"
                      >
                        {actionLoading === `${b._id}:confirmed` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => updateStatus(b._id, "cancelled")}
                        disabled={actionLoading === `${b._id}:cancelled`}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white active:bg-red-700 disabled:opacity-60"
                      >
                        {actionLoading === `${b._id}:cancelled` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <XCircle size={14} />
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmed / In-Progress */}
          <div className={card}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white">
                Active Jobs
              </h3>
              <span className="text-xs font-black text-slate-500">
                {confirmedBookings.length} active
              </span>
            </div>

            {confirmedBookings.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-black/5 dark:bg-slate-800">
                <p className="font-black text-slate-700 dark:text-white">
                  No active jobs
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Confirmed bookings appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {confirmedBookings.slice(0, 6).map((b) => (
                  <div
                    key={b._id}
                    className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">
                        {b.serviceType}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-slate-500">
                          {new Date(b.preferredDate).toLocaleDateString()} ·{" "}
                          {b.preferredTime}
                        </p>
                        {b.serviceCategory === "digital" && b.deadline && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300">
                            Due {new Date(b.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {b.serviceCategory === "field" && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300">
                            Field · Mark Arrived First
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/bookings/${b._id}`)}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white active:bg-blue-700"
                      >
                        <ArrowRight size={14} /> Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Profile strength */}
        <div className="space-y-6 lg:col-span-5">
          <div className={card}>
            <h3 className="mb-4 font-black text-slate-900 dark:text-white">
              Profile Strength
            </h3>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Completion
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {profileCompletion.percent}%
              </p>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-700"
                style={{ width: `${profileCompletion.percent}%` }}
              />
            </div>

            {profileCompletion.missing.length > 0 ? (
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-500/20">
                <p className="flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-300">
                  <TrendingUp size={15} /> Improve visibility by adding:
                </p>
                <ul className="mt-2 space-y-0.5 text-sm font-bold text-amber-900 dark:text-amber-400">
                  {profileCompletion.missing.slice(0, 6).map((m) => (
                    <li key={m}>• {m}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100 dark:bg-emerald-500/10">
                <p className="flex items-center gap-2 text-sm font-black text-emerald-800 dark:text-emerald-300">
                  <BadgeCheck size={15} /> Perfect profile — fully searchable!
                </p>
              </div>
            )}

            <button
              onClick={() => router.push("/freelancer/profile")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white active:bg-slate-700 dark:bg-white dark:text-slate-900"
            >
              Update Profile <ArrowRight size={16} />
            </button>
          </div>

          {/* Quick Info */}
          <div className={card}>
            <h3 className="mb-4 font-black text-slate-900 dark:text-white">
              Quick Info
            </h3>
            <div className="space-y-3 text-sm font-bold text-slate-700 dark:text-slate-300">
              <p className="flex items-center gap-2">
                <Briefcase size={15} className="text-slate-400" />
                {profile?.title || "No title yet"}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={15} className="text-slate-400" />
                {profile?.city && profile?.country
                  ? `${profile.city}, ${profile.country}`
                  : "Location not set"}
              </p>
              <p className="flex items-center gap-2">
                <Star size={15} className="text-amber-500" />
                Reviews increase trust — ask clients to leave one
              </p>
              <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Shield size={13} className="text-slate-400" />
                For field jobs: always mark "Arrived" via the booking page
                before completing
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <GetLocationButton />
      </div>
    </div>
  );
}
