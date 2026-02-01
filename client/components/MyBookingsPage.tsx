"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import ReviewModal from "@/components/ReviewModal";
import { useUser } from "@/context/UserContext";
import {
  Calendar,
  Clock,
  Star,
  Loader2,
  Briefcase,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Filter,
  Search,
  SortAsc,
  ChevronDown,
  ChevronUp,
  MapPin,
  Timer,
} from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

type Booking = {
  _id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: BookingStatus;

  address?: string;
  issueDescription?: string;
  estimatedDurationMinutes?: number;

  clientId?: { name?: string; email?: string };
  freelancerId?: { name?: string; email?: string };
};

function formatDate(d: string | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function statusPill(status: BookingStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300";
    case "confirmed":
      return "bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-500/15 dark:text-indigo-300";
    case "cancelled":
      return "bg-red-500/10 text-red-700 ring-1 ring-red-500/15 dark:text-red-300";
    default:
      return "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/15 dark:text-blue-300";
  }
}

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { user } = useUser();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // UI controls
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // review modal
  const [showReview, setShowReview] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  // actions + toast
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      completed: bookings.filter((b) => b.status === "completed").length,
    };
  }, [bookings]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get("/bookings/mybookings");
        setBookings(res.data.data || []);
      } catch (err: any) {
        if (err.response?.status === 401) router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [router]);

  const filteredBookings = useMemo(() => {
    let list = [...bookings];

    if (filter !== "all") list = list.filter((b) => b.status === filter);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((b) => {
        const s1 = b.serviceType?.toLowerCase() ?? "";
        const s2 = b.issueDescription?.toLowerCase() ?? "";
        const s3 = b.address?.toLowerCase() ?? "";
        const clientName = b.clientId?.name?.toLowerCase() ?? "";
        return (
          s1.includes(q) ||
          s2.includes(q) ||
          s3.includes(q) ||
          clientName.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      const da = new Date(a.preferredDate).getTime();
      const db = new Date(b.preferredDate).getTime();
      return sort === "newest" ? db - da : da - db;
    });

    return list;
  }, [bookings, filter, query, sort]);

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

      setToast(`Booking updated → ${statusLabel(status as BookingStatus)}`);
    } catch (err: any) {
      setToast(err?.response?.data?.msg || "Failed to update booking status");
    } finally {
      setActionLoading(null);
    }
  };

  // ---------------------------
  // Loading state
  // ---------------------------
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="animate-spin" size={44} />
        <p className="font-extrabold">Loading bookings…</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-slate-900 px-5 py-3 text-white font-extrabold shadow-lg dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}

      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-44 -left-44 h-[30rem] w-[30rem] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative px-6 py-7 lg:px-10 lg:py-9 border-b border-slate-200 dark:border-white/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <BadgeCheck size={16} className="text-blue-500" />
                Bookings Dashboard
              </p>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                My Bookings
              </h1>

              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Track requests, manage confirmations, and finish jobs with one
                click.
              </p>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
              >
                Go to Dashboard
              </button>

              <button
                onClick={() =>
                  router.push(
                    user?.role === "freelancer"
                      ? "/freelancer/profile"
                      : "/search",
                  )
                }
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                {user?.role === "freelancer"
                  ? "Improve Profile"
                  : "Find Freelancers"}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Total"
              value={stats.total}
              icon={<Briefcase size={18} />}
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon={<Timer size={18} />}
            />
            <StatCard
              label="Confirmed"
              value={stats.confirmed}
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              icon={<BadgeCheck size={18} />}
            />
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="relative px-6 py-5 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* search */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <Search size={18} className="text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search service, address, notes, client…"
                  className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>
            </div>

            {/* filter */}
            <div className="lg:col-span-4">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <Filter size={18} className="text-slate-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full bg-transparent text-sm font-black text-slate-900 outline-none dark:text-white"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* sort */}
            <div className="lg:col-span-3">
              <button
                onClick={() =>
                  setSort((s) => (s === "newest" ? "oldest" : "newest"))
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
              >
                <SortAsc
                  size={18}
                  className="text-slate-500 dark:text-slate-300"
                />
                Sort: {sort === "newest" ? "Newest" : "Oldest"}
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="mt-6">
            {filteredBookings.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-slate-950">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-900">
                  <Briefcase size={28} className="text-slate-400" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  No bookings found
                </p>
                <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  Try changing filters or search query.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredBookings.map((b) => {
                  const expanded = expandedId === b._id;

                  return (
                    <div
                      key={b._id}
                      className="rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-slate-950"
                    >
                      {/* Top row */}
                      <div className="p-6">
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start gap-4">
                            <div className="rounded-2xl bg-slate-900 p-3 text-white dark:bg-white dark:text-slate-900">
                              <Briefcase size={22} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="truncate text-xl font-black text-slate-900 dark:text-white">
                                  {b.serviceType}
                                </h3>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${statusPill(
                                    b.status,
                                  )}`}
                                >
                                  {statusLabel(b.status)}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                                  <Calendar
                                    size={16}
                                    className="text-slate-400"
                                  />
                                  {formatDate(b.preferredDate)}
                                </div>

                                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                                  <Clock size={16} className="text-slate-400" />
                                  {b.preferredTime || "—"}
                                </div>

                                <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                                  <Timer size={16} className="text-slate-400" />
                                  {typeof b.estimatedDurationMinutes ===
                                  "number"
                                    ? `${b.estimatedDurationMinutes} mins`
                                    : "Duration —"}
                                </div>
                              </div>

                              {/* client display for freelancer */}
                              {user?.role === "freelancer" && (
                                <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                                  Client:{" "}
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {b.clientId?.name || "Unknown"}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-3 w-full md:w-auto">
                            {/* Expand */}
                            <button
                              onClick={() =>
                                setExpandedId((id) =>
                                  id === b._id ? null : b._id,
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
                            >
                              {expanded ? (
                                <>
                                  Hide details <ChevronUp size={18} />
                                </>
                              ) : (
                                <>
                                  View details <ChevronDown size={18} />
                                </>
                              )}
                            </button>

                            {/* Freelancer actions */}
                            {user?.role === "freelancer" &&
                              b.status === "pending" && (
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    onClick={() =>
                                      updateStatus(b._id, "confirmed")
                                    }
                                    disabled={
                                      actionLoading === `${b._id}:confirmed`
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                                  >
                                    {actionLoading === `${b._id}:confirmed` ? (
                                      <Loader2
                                        size={18}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <CheckCircle2 size={18} />
                                    )}
                                    Accept
                                  </button>

                                  <button
                                    onClick={() =>
                                      updateStatus(b._id, "cancelled")
                                    }
                                    disabled={
                                      actionLoading === `${b._id}:cancelled`
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                                  >
                                    {actionLoading === `${b._id}:cancelled` ? (
                                      <Loader2
                                        size={18}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <XCircle size={18} />
                                    )}
                                    Reject
                                  </button>
                                </div>
                              )}

                            {user?.role === "freelancer" &&
                              b.status === "confirmed" && (
                                <button
                                  onClick={() =>
                                    updateStatus(b._id, "completed")
                                  }
                                  disabled={
                                    actionLoading === `${b._id}:completed`
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
                                >
                                  {actionLoading === `${b._id}:completed` ? (
                                    <Loader2
                                      size={18}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <CheckCircle2 size={18} />
                                  )}
                                  Mark Completed
                                </button>
                              )}

                            {/* Client review */}
                            {user?.role === "client" &&
                              b.status === "completed" && (
                                <button
                                  onClick={() => {
                                    setSelectedBooking(b._id);
                                    setShowReview(true);
                                  }}
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white hover:bg-amber-600 shadow-lg shadow-amber-100/40 dark:shadow-none"
                                >
                                  <Star size={18} fill="currentColor" />
                                  Leave Review
                                </button>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Expand details */}
                      {expanded && (
                        <div className="border-t border-slate-200 px-6 py-5 dark:border-white/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailBox
                              icon={
                                <MapPin size={16} className="text-slate-400" />
                              }
                              title="Address"
                              value={b.address || "—"}
                            />
                            <DetailBox
                              icon={
                                <Briefcase
                                  size={16}
                                  className="text-slate-400"
                                />
                              }
                              title="Booking ID"
                              value={b._id}
                              mono
                            />
                            <DetailBox
                              icon={
                                <Clock size={16} className="text-slate-400" />
                              }
                              title="Preferred Time"
                              value={b.preferredTime || "—"}
                            />
                            <DetailBox
                              icon={
                                <Star size={16} className="text-amber-500" />
                              }
                              title="Notes"
                              value={b.issueDescription || "No notes provided"}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReview && selectedBooking && (
        <ReviewModal
          bookingId={selectedBooking}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function DetailBox({
  icon,
  title,
  value,
  mono,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">
        {icon}
        {title}
      </div>
      <p
        className={[
          "mt-3 text-sm font-bold text-slate-900 dark:text-white",
          mono ? "font-mono break-all" : "break-words",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
