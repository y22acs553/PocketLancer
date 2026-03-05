"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/services/api";
import ReviewModal from "@/components/ReviewModal";
import DisputeModal from "@/components/DisputeModal";
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
  IndianRupee,
  ShieldCheck,
  Globe,
  Zap,
  Lock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";
type PaymentStatus =
  | "unpaid"
  | "pending"
  | "held"
  | "partially_released"
  | "released"
  | "refunded"
  | "partial_refund"
  | "field_pending"
  | "field_paid";

type Booking = {
  _id: string;
  serviceType: string;
  serviceCategory?: "field" | "digital";
  preferredDate: string;
  preferredTime: string;
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  agreedAmount?: number;
  pricingType?: string;
  address?: string;
  issueDescription?: string;
  estimatedDurationMinutes?: number;
  clientId?: { name?: string; email?: string };
  freelancerId?: { name?: string; email?: string; title?: string };
  paidAt?: string;
  releasedAt?: string;
};

function formatDate(d: string | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function statusPill(status: BookingStatus) {
  const map: Record<BookingStatus, string> = {
    completed:
      "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300",
    confirmed:
      "bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-500/15 dark:text-indigo-300",
    in_progress:
      "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/15 dark:text-blue-300",
    cancelled:
      "bg-red-500/10 text-red-700 ring-1 ring-red-500/15 dark:text-red-300",
    disputed:
      "bg-orange-500/10 text-orange-700 ring-1 ring-orange-500/15 dark:text-orange-300",
    pending:
      "bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/15 dark:text-slate-300",
  };
  return map[status] || map.pending;
}

function paymentStatusBadge(ps: PaymentStatus | undefined) {
  if (!ps) return null;
  const map: Record<string, { label: string; cls: string }> = {
    unpaid: {
      label: "Unpaid",
      cls: "bg-red-500/10 text-red-700 dark:text-red-300",
    },
    pending: {
      label: "Payment Pending",
      cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    held: {
      label: "In Escrow",
      cls: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
    partially_released: {
      label: "Partially Released",
      cls: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    },
    released: {
      label: "Payment Released",
      cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    refunded: {
      label: "Refunded",
      cls: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    },
    partial_refund: {
      label: "Partial Refund",
      cls: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    },
    field_pending: {
      label: "Pay at Location",
      cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    field_paid: {
      label: "Paid at Location",
      cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
  };
  const entry = map[ps];
  if (!entry) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ${entry.cls}`}
    >
      {ps === "held" ? (
        <Lock size={10} />
      ) : ps === "released" || ps === "field_paid" ? (
        <CheckCircle2 size={10} />
      ) : (
        <IndianRupee size={10} />
      )}
      {entry.label}
    </span>
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
        className={`mt-3 text-sm font-bold text-slate-900 dark:text-white ${mono ? "font-mono break-all" : "break-words"}`}
      >
        {value}
      </p>
    </div>
  );
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { user } = useUser();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeBooking, setDisputeBooking] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const stats = useMemo(
    () => ({
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter(
        (b) => b.status === "confirmed" || b.status === "in_progress",
      ).length,
      completed: bookings.filter((b) => b.status === "completed").length,
    }),
    [bookings],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    api
      .get("/bookings/mybookings")
      .then((r) => setBookings(r.data.data || []))
      .catch((err) => {
        if (err.response?.status === 401) router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filteredBookings = useMemo(() => {
    let list = [...bookings];
    if (filter !== "all") list = list.filter((b) => b.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          (b.serviceType?.toLowerCase() || "").includes(q) ||
          (b.issueDescription?.toLowerCase() || "").includes(q) ||
          (b.address?.toLowerCase() || "").includes(q) ||
          (b.clientId?.name?.toLowerCase() || "").includes(q),
      );
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
    status: "confirmed" | "completed" | "cancelled" | "in_progress",
  ) => {
    try {
      setActionLoading(`${bookingId}:${status}`);
      await api.patch(`/bookings/${bookingId}/status`, { status });
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status } : b)),
      );
      setToast(`Booking updated → ${status}`);
    } catch (err: any) {
      setToast(err?.response?.data?.msg || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const releasePayment = async (bookingId: string) => {
    try {
      setActionLoading(`${bookingId}:release`);
      await api.post(`/bookings/${bookingId}/payment/release`);
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, paymentStatus: "released", status: "completed" }
            : b,
        ),
      );
      setToast("✅ Payment released to freelancer!");
    } catch (err: any) {
      setToast(err?.response?.data?.msg || "Failed to release payment");
    } finally {
      setActionLoading(null);
    }
  };

  const markFieldPaid = async (bookingId: string) => {
    try {
      setActionLoading(`${bookingId}:field_paid`);
      await api.patch(`/bookings/${bookingId}/field-paid`);
      setBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, paymentStatus: "field_paid", status: "completed" }
            : b,
        ),
      );
      setToast("✅ Marked as paid at location");
    } catch (err: any) {
      setToast(err?.response?.data?.msg || "Failed to update");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-slate-500">
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

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-44 -left-44 h-[30rem] w-[30rem] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative border-b border-slate-200 px-6 py-7 lg:px-10 lg:py-9 dark:border-white/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <BadgeCheck size={16} className="text-blue-500" /> Bookings
                Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
                My Bookings
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
                Track requests, manage payments, and complete jobs.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white"
              >
                Dashboard
              </button>
              <button
                onClick={() =>
                  router.push(
                    user?.role === "freelancer"
                      ? "/freelancer/profile"
                      : "/search",
                  )
                }
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                {user?.role === "freelancer"
                  ? "Improve Profile"
                  : "Find Freelancers"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
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
              label="Active"
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

        {/* Toolbar + list */}
        <div className="relative px-6 py-5 lg:px-10">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <Search size={18} className="text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search service, notes, address, client…"
                  className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>
            </div>
            <div className="lg:col-span-4">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <Filter size={18} className="text-slate-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full bg-transparent text-sm font-black text-slate-900 outline-none dark:text-white"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="lg:col-span-3">
              <button
                onClick={() =>
                  setSort((s) => (s === "newest" ? "oldest" : "newest"))
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
              >
                <SortAsc
                  size={18}
                  className="text-slate-500 dark:text-slate-300"
                />
                {sort === "newest" ? "Newest first" : "Oldest first"}
              </button>
            </div>
          </div>

          {/* Bookings list */}
          <div className="mt-6">
            {filteredBookings.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-slate-950">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-900">
                  <Briefcase size={28} className="text-slate-400" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  No bookings found
                </p>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Try changing filters or search terms.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredBookings.map((b) => {
                  const expanded = expandedId === b._id;
                  const isDigital = b.serviceCategory === "digital";
                  const isClient = user?.role === "client";
                  const isFreelancer = user?.role === "freelancer";

                  // Can client release payment?
                  const canRelease =
                    isClient &&
                    isDigital &&
                    b.paymentStatus === "held" &&
                    b.status === "in_progress";
                  // Can freelancer mark field paid?
                  const canMarkFieldPaid =
                    isFreelancer && !isDigital && b.status === "confirmed";

                  return (
                    <div
                      key={b._id}
                      className="rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-slate-950"
                    >
                      <div className="p-6">
                        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                          <div className="flex items-start gap-4 min-w-0">
                            {/* Icon */}
                            <div
                              className={`rounded-2xl p-3 text-white flex-shrink-0 ${isDigital ? "bg-violet-600" : "bg-slate-900 dark:bg-white dark:text-slate-900"}`}
                            >
                              {isDigital ? (
                                <Globe size={22} />
                              ) : (
                                <Briefcase size={22} />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                                  {b.serviceType}
                                </h3>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-xs font-black uppercase tracking-widest ${statusPill(b.status)}`}
                                >
                                  {b.status.replace("_", " ")}
                                </span>
                                {b.paymentStatus &&
                                  paymentStatusBadge(b.paymentStatus)}
                                {isDigital ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-black text-violet-700 dark:text-violet-300">
                                    <Globe size={10} /> Digital
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
                                    <Zap size={10} /> Field
                                  </span>
                                )}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                                {b.preferredDate && !isDigital && (
                                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                                    <Calendar
                                      size={14}
                                      className="text-slate-400"
                                    />{" "}
                                    {formatDate(b.preferredDate)}
                                  </div>
                                )}
                                {b.preferredTime && !isDigital && (
                                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                                    <Clock
                                      size={14}
                                      className="text-slate-400"
                                    />{" "}
                                    {b.preferredTime}
                                  </div>
                                )}
                                {typeof b.agreedAmount === "number" &&
                                  b.agreedAmount > 0 && (
                                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                                      <IndianRupee
                                        size={14}
                                        className="text-slate-400"
                                      />
                                      ₹{b.agreedAmount.toLocaleString("en-IN")}
                                      {b.pricingType === "hourly" && "/hr est."}
                                    </div>
                                  )}
                              </div>

                              {isFreelancer && b.clientId?.name && (
                                <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                                  Client:{" "}
                                  <span className="font-black text-slate-900 dark:text-white">
                                    {b.clientId.name}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions column */}
                          <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[180px]">
                            {/* Expand */}
                            <button
                              onClick={() =>
                                setExpandedId((id) =>
                                  id === b._id ? null : b._id,
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
                            >
                              {expanded ? (
                                <>
                                  <ChevronUp size={16} /> Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={16} /> Details
                                </>
                              )}
                            </button>

                            {/* ── FREELANCER ACTIONS ── */}
                            {isFreelancer && b.status === "pending" && (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() =>
                                    updateStatus(b._id, "confirmed")
                                  }
                                  disabled={
                                    actionLoading === `${b._id}:confirmed`
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  {actionLoading === `${b._id}:confirmed` ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <CheckCircle2 size={14} />
                                  )}{" "}
                                  Accept
                                </button>
                                <button
                                  onClick={() =>
                                    updateStatus(b._id, "cancelled")
                                  }
                                  disabled={
                                    actionLoading === `${b._id}:cancelled`
                                  }
                                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-red-600 px-3 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {actionLoading === `${b._id}:cancelled` ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <XCircle size={14} />
                                  )}{" "}
                                  Reject
                                </button>
                              </div>
                            )}

                            {isFreelancer && b.status === "confirmed" && (
                              <button
                                onClick={() =>
                                  updateStatus(
                                    b._id,
                                    isDigital ? "in_progress" : "completed",
                                  )
                                }
                                disabled={!!actionLoading}
                                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                {actionLoading ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                {isDigital
                                  ? "Mark Delivered"
                                  : "Mark Completed"}
                              </button>
                            )}

                            {canMarkFieldPaid && (
                              <button
                                onClick={() => markFieldPaid(b._id)}
                                disabled={
                                  actionLoading === `${b._id}:field_paid`
                                }
                                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {actionLoading === `${b._id}:field_paid` ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                Mark Paid
                              </button>
                            )}

                            {/* ── CLIENT ACTIONS ── */}
                            {/* Release escrow payment — digital booking, work delivered */}
                            {canRelease && (
                              <button
                                onClick={() => releasePayment(b._id)}
                                disabled={actionLoading === `${b._id}:release`}
                                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-60 shadow-lg shadow-violet-200 dark:shadow-none"
                              >
                                {actionLoading === `${b._id}:release` ? (
                                  <>
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />{" "}
                                    Releasing…
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={14} /> Release Payment
                                  </>
                                )}
                              </button>
                            )}

                            {/* Leave review — completed */}
                            {isClient && b.status === "completed" && (
                              <button
                                onClick={() => {
                                  setSelectedBooking(b._id);
                                  setShowReview(true);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-black text-white hover:bg-amber-600"
                              >
                                <Star size={14} fill="currentColor" /> Leave
                                Review
                              </button>
                            )}

                            {/* Dispute */}
                            {b.status === "completed" && (
                              <button
                                onClick={() => {
                                  setDisputeBooking(b._id);
                                  setShowDispute(true);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:bg-slate-950 dark:text-red-400 dark:hover:bg-red-500/10"
                              >
                                <AlertCircle size={14} /> Raise Dispute
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {expanded && (
                        <div className="border-t border-slate-200 px-6 py-5 dark:border-white/10">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {!isDigital && (
                              <DetailBox
                                icon={
                                  <MapPin
                                    size={15}
                                    className="text-slate-400"
                                  />
                                }
                                title="Address"
                                value={b.address || "—"}
                              />
                            )}
                            {isDigital && b.paymentStatus === "held" && (
                              <div className="col-span-full rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/20 dark:bg-violet-500/10">
                                <div className="flex items-start gap-3">
                                  <Lock
                                    size={16}
                                    className="mt-0.5 text-violet-600 dark:text-violet-400"
                                  />
                                  <div>
                                    <p className="text-sm font-black text-violet-900 dark:text-violet-100">
                                      Payment in Escrow
                                    </p>
                                    <p className="mt-1 text-xs font-bold text-violet-700 dark:text-violet-300">
                                      ₹
                                      {(b.agreedAmount || 0).toLocaleString(
                                        "en-IN",
                                      )}{" "}
                                      is held securely.
                                      {b.status === "in_progress"
                                        ? " The freelancer has delivered — review their work and release payment to complete."
                                        : " Payment will be released when you approve the completed work."}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            <DetailBox
                              icon={
                                <Briefcase
                                  size={15}
                                  className="text-slate-400"
                                />
                              }
                              title="Booking ID"
                              value={b._id}
                              mono
                            />
                            {!isDigital && (
                              <DetailBox
                                icon={
                                  <Clock size={15} className="text-slate-400" />
                                }
                                title="Time"
                                value={b.preferredTime || "—"}
                              />
                            )}
                            <DetailBox
                              icon={
                                <Star size={15} className="text-amber-500" />
                              }
                              title="Notes"
                              value={b.issueDescription || "No notes provided"}
                            />
                            {typeof b.agreedAmount === "number" && (
                              <DetailBox
                                icon={
                                  <IndianRupee
                                    size={15}
                                    className="text-slate-400"
                                  />
                                }
                                title="Agreed Amount"
                                value={`₹${b.agreedAmount.toLocaleString("en-IN")}`}
                              />
                            )}
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

      {showReview && selectedBooking && (
        <ReviewModal
          bookingId={selectedBooking}
          onClose={() => setShowReview(false)}
        />
      )}
      {showDispute && disputeBooking && (
        <DisputeModal
          bookingId={disputeBooking}
          onClose={() => setShowDispute(false)}
        />
      )}
    </div>
  );
}
