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
} from "lucide-react";

type Booking = {
  _id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
};

type Profile = {
  title?: string;
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  city?: string;
  country?: string;
  profilePic?: string;
  location?: {
    type: "Point";
    coordinates: number[];
  };
  portfolio?: string[];
  pastWorks?: any[];
};

export default function FreelancerDashboard() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string>("");

  const cardClass =
    "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-all";

  const loadAll = async () => {
    try {
      setLoading(true);
      const [bRes, pRes] = await Promise.all([
        api.get("/bookings/mybookings"),
        api.get("/freelancers/me"),
      ]);

      setBookings(bRes.data?.data || []);
      setProfile(pRes.data?.profile || null);
    } catch {
      setBookings([]);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const bookingStats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    return { total, completed, confirmed, pending };
  }, [bookings]);

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings],
  );

  const confirmedBookings = useMemo(
    () => bookings.filter((b) => b.status === "confirmed"),
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
    if (!coords || coords.length !== 2) missing.push("Location");

    const totalFields = 7;
    const done = totalFields - missing.length;
    const percent = Math.round((done / totalFields) * 100);

    return { percent, missing };
  }, [profile]);

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
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="animate-spin" />
        Loading freelancer dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-slate-900 px-5 py-3 text-white font-extrabold shadow-lg">
          {toast}
        </div>
      )}

      {/* Welcome */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-8 text-white shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm text-slate-200 font-bold">Welcome back</p>
            <h2 className="text-3xl font-extrabold mt-1">
              {user?.name || "Freelancer"}
            </h2>
            <p className="text-slate-200 mt-2">
              Manage bookings & keep your profile strong to get more clients.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/freelancer/profile")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-extrabold text-slate-900 hover:bg-slate-100"
            >
              <User size={18} />
              Edit Profile
            </button>

            <button
              onClick={() => router.push("/freelancer/bookings")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-5 py-3 font-extrabold text-white hover:bg-white/10"
            >
              <CalendarCheck2 size={18} />
              All Bookings
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={cardClass}>
          <p className="text-xs font-extrabold tracking-widest text-slate-400">
            TOTAL BOOKINGS
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {bookingStats.total}
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-xs font-extrabold tracking-widest text-slate-400">
            CONFIRMED
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {bookingStats.confirmed}
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-xs font-extrabold tracking-widest text-slate-400">
            PENDING
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {bookingStats.pending}
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-xs font-extrabold tracking-widest text-slate-400">
            COMPLETED
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {bookingStats.completed}
          </p>
        </div>
      </div>

      {/* Requests + Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Requests */}
        <div className="lg:col-span-7 space-y-6">
          {/* Pending Requests */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <ClipboardList size={20} />
                Pending Requests
              </h3>
              <span className="text-xs font-extrabold text-slate-500">
                {pendingBookings.length} pending
              </span>
            </div>

            {pendingBookings.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-black/5">
                <p className="font-bold text-slate-700">No pending requests</p>
                <p className="text-sm text-slate-500 mt-1">
                  When clients book your service, requests will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.slice(0, 6).map((b) => (
                  <div
                    key={b._id}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <p className="font-extrabold text-slate-900">
                        {b.serviceType}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(b.preferredDate).toLocaleDateString()} ·{" "}
                        {b.preferredTime}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => updateStatus(b._id, "confirmed")}
                        disabled={actionLoading === `${b._id}:confirmed`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {actionLoading === `${b._id}:confirmed` ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Accept
                      </button>

                      <button
                        onClick={() => updateStatus(b._id, "cancelled")}
                        disabled={actionLoading === `${b._id}:cancelled`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {actionLoading === `${b._id}:cancelled` ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmed Jobs */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-slate-900">
                Confirmed Jobs
              </h3>
              <span className="text-xs font-extrabold text-slate-500">
                {confirmedBookings.length} active
              </span>
            </div>

            {confirmedBookings.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-black/5">
                <p className="font-bold text-slate-700">No active jobs</p>
                <p className="text-sm text-slate-500 mt-1">
                  Confirmed bookings will appear here until completed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {confirmedBookings.slice(0, 6).map((b) => (
                  <div
                    key={b._id}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <p className="font-extrabold text-slate-900">
                        {b.serviceType}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(b.preferredDate).toLocaleDateString()} ·{" "}
                        {b.preferredTime}
                      </p>
                    </div>

                    <button
                      onClick={() => updateStatus(b._id, "completed")}
                      disabled={actionLoading === `${b._id}:completed`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {actionLoading === `${b._id}:completed` ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      Mark Completed
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Profile strength */}
        <div className="lg:col-span-5 space-y-6">
          <div className={cardClass}>
            <h3 className="text-xl font-extrabold text-slate-900 mb-4">
              Profile Strength
            </h3>

            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-slate-600">
                Completion Score
              </p>
              <p className="text-sm font-extrabold text-slate-900">
                {profileCompletion.percent}%
              </p>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${profileCompletion.percent}%` }}
              />
            </div>

            {profileCompletion.missing.length > 0 ? (
              <div className="mt-4 rounded-2xl bg-amber-50 ring-1 ring-amber-100 p-4">
                <p className="text-sm font-extrabold text-amber-800 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Improve visibility by adding:
                </p>
                <ul className="mt-2 text-sm text-amber-900 space-y-1 font-semibold">
                  {profileCompletion.missing.slice(0, 6).map((m) => (
                    <li key={m}>• {m}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 p-4">
                <p className="text-sm font-extrabold text-emerald-800 flex items-center gap-2">
                  <BadgeCheck size={16} />
                  Perfect profile — you are fully searchable!
                </p>
              </div>
            )}

            <button
              onClick={() => router.push("/freelancer/profile")}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-extrabold text-white hover:bg-slate-800"
            >
              Update Profile <ArrowRight size={18} />
            </button>
          </div>

          <div className={cardClass}>
            <h3 className="text-xl font-extrabold text-slate-900 mb-4">
              Quick Info
            </h3>

            <div className="space-y-3 text-sm font-bold text-slate-700">
              <p className="flex items-center gap-2">
                <Briefcase size={16} className="text-slate-500" />
                {profile?.title || "No title yet"}
              </p>

              <p className="flex items-center gap-2">
                <MapPin size={16} className="text-slate-500" />
                {profile?.city && profile?.country
                  ? `${profile.city}, ${profile.country}`
                  : "Location not set"}
              </p>

              <p className="flex items-center gap-2">
                <Star size={16} className="text-amber-500" />
                Reviews increase trust (ask clients to leave review)
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
