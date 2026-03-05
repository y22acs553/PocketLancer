// client/app/bookings/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import DisputeModal from "@/components/DisputeModal";
import { getCurrentLocation } from "@/utils/geolocation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  BadgeCheck,
  ShieldAlert,
  CreditCard,
  Star,
  AlertTriangle,
  IndianRupee,
  Navigation,
  ThumbsUp,
  Hourglass,
  Shield,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type MilestoneStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "approved"
  | "released";

interface Milestone {
  _id: string;
  title: string;
  description: string;
  amount: number;
  order: number;
  status: MilestoneStatus;
}

interface Booking {
  _id: string;
  serviceType: string;
  issueDescription: string;
  preferredDate: string;
  preferredTime: string;
  address: string;
  serviceCategory: "field" | "digital";
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "pending_approval"
    | "completed"
    | "cancelled"
    | "disputed";
  estimatedDurationMinutes: number;
  pricingType: "hourly" | "fixed" | "milestone";
  agreedAmount: number;
  paymentStatus: string;
  escrowAmount: number;
  releasedAmount: number;
  refundedAmount: number;
  paidAt?: string;
  disputeLocked: boolean;
  milestones: Milestone[];
  arrivedAt?: string;
  arrivalVerified?: boolean;
  deadline?: string;
  autoReleaseAt?: string;
  clientId: { _id: string; name: string; email: string; honorScore?: number };
  freelancerId: { _id: string; title: string; user: string; name?: string };
  createdAt: string;
}

// ── Style maps ─────────────────────────────────────────────────────
const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: {
    bg: "bg-blue-100 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    label: "Pending",
  },
  confirmed: {
    bg: "bg-indigo-100 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-300",
    label: "Confirmed",
  },
  in_progress: {
    bg: "bg-sky-100 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    label: "In Progress",
  },
  pending_approval: {
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    label: "Awaiting Your Approval",
  },
  completed: {
    bg: "bg-emerald-100 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "Completed",
  },
  cancelled: {
    bg: "bg-red-100 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    label: "Cancelled",
  },
  disputed: {
    bg: "bg-orange-100 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    label: "Disputed",
  },
};

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Not paid",
  pending: "Payment pending",
  held: "In escrow",
  partially_released: "Partially released",
  released: "Released",
  refunded: "Refunded",
  partial_refund: "Partial refund",
  field_pending: "Pay at location",
  field_paid: "Paid at location",
};

const MILESTONE_STYLES: Record<MilestoneStatus, { bg: string; text: string }> =
  {
    pending: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-500 dark:text-slate-400",
    },
    in_progress: {
      bg: "bg-blue-100 dark:bg-blue-900/40",
      text: "text-blue-600 dark:text-blue-300",
    },
    submitted: {
      bg: "bg-amber-100 dark:bg-amber-900/40",
      text: "text-amber-700 dark:text-amber-300",
    },
    approved: {
      bg: "bg-emerald-100 dark:bg-emerald-900/40",
      text: "text-emerald-700 dark:text-emerald-300",
    },
    released: {
      bg: "bg-emerald-200 dark:bg-emerald-900/60",
      text: "text-emerald-800 dark:text-emerald-200",
    },
  };

function HonorBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const cls =
    score < 35
      ? "bg-red-50 text-red-700 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20"
      : score < 75
        ? "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20"
        : "bg-green-50 text-green-700 ring-green-100 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-500/20";
  const label = score < 35 ? "Low Trust" : score < 75 ? "Average" : "Trusted";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-black ring-1 ${cls}`}
    >
      <Shield size={10} /> {label} · {score}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok?: boolean } | null>(
    null,
  );
  const [showDispute, setShowDispute] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bookings/${id}`);
      setBooking(res.data.booking);
    } catch (err: any) {
      setError(err.response?.data?.msg || "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // ── Actions ──────────────────────────────────────────────────────
  const updateStatus = async (status: string) => {
    try {
      setActionLoading(status);
      await api.patch(`/bookings/${id}/status`, { status });
      await fetchBooking();
      showToast(
        `Booking ${status === "confirmed" ? "accepted" : status === "cancelled" ? "rejected" : "updated"}`,
      );
    } catch (err: any) {
      showToast(err.response?.data?.msg || "Failed", false);
    } finally {
      setActionLoading("");
    }
  };

  const markArrived = async () => {
    try {
      setActionLoading("arrive");
      const coords = await getCurrentLocation();
      await api.patch(`/bookings/${id}/arrive`, {
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      await fetchBooking();
      showToast("Arrival marked! Client has been notified.");
    } catch (err: any) {
      showToast(
        err.response?.data?.msg || err.message || "Failed to get location",
        false,
      );
    } finally {
      setActionLoading("");
    }
  };

  const confirmField = async () => {
    try {
      setActionLoading("confirm_field");
      await api.patch(`/bookings/${id}/confirm-field`);
      await fetchBooking();
      showToast("Work confirmed! Honor Score +2");
    } catch (err: any) {
      showToast(err.response?.data?.msg || "Failed", false);
    } finally {
      setActionLoading("");
    }
  };

  const releasePayment = async () => {
    try {
      setActionLoading("release");
      await api.post(`/bookings/${id}/payment/release`);
      await fetchBooking();
      showToast("Payment released! Honor Score +2");
    } catch (err: any) {
      showToast(err.response?.data?.msg || "Failed", false);
    } finally {
      setActionLoading("");
    }
  };

  const initiatePayment = async () => {
    try {
      setActionLoading("pay");
      const res = await api.post(`/bookings/${id}/payment/create-order`);
      const { razorpayOrderId, amount, currency, keyId } = res.data;

      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: "PocketLancer",
        description: booking?.serviceType,
        handler: async (response: any) => {
          await api.post(`/bookings/${id}/payment/verify`, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          await fetchBooking();
          showToast("Payment successful! Funds held in escrow.");
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#0f172a" },
      });
      rzp.open();
    } catch (err: any) {
      showToast(err.response?.data?.msg || "Payment failed", false);
    } finally {
      setActionLoading("");
    }
  };

  const updateMilestone = async (milestoneId: string, status: string) => {
    try {
      setActionLoading(milestoneId + status);
      await api.patch(`/bookings/${id}/milestone/${milestoneId}`, { status });
      await fetchBooking();
      showToast("Milestone updated");
    } catch {
      showToast("Failed", false);
    } finally {
      setActionLoading("");
    }
  };

  const approveMilestone = async (milestoneId: string) => {
    try {
      setActionLoading(milestoneId + "approve");
      await api.patch(`/bookings/${id}/milestone/${milestoneId}/approve`);
      await fetchBooking();
      showToast("Milestone approved!");
    } catch {
      showToast("Failed", false);
    } finally {
      setActionLoading("");
    }
  };

  // ── Render states ────────────────────────────────────────────────
  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={36} className="animate-spin text-slate-400" />
      </div>
    );

  if (error || !booking)
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="font-bold text-slate-600 dark:text-slate-300">
          {error || "Booking not found"}
        </p>
        <button
          onClick={() => router.back()}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white dark:bg-white dark:text-slate-900"
        >
          Go back
        </button>
      </div>
    );

  const isClient = user?._id === booking.clientId._id;
  const isFreelancer = !isClient;
  const isField = booking.serviceCategory === "field";
  const statusStyle = STATUS_STYLES[booking.status] || STATUS_STYLES.pending;

  const deadlineDate = booking.deadline ? new Date(booking.deadline) : null;
  const autoReleaseDate = booking.autoReleaseAt
    ? new Date(booking.autoReleaseAt)
    : null;

  // Field freelancer can mark arrived if confirmed or in_progress and not yet arrived
  const canMarkArrived =
    isFreelancer &&
    isField &&
    ["confirmed", "in_progress"].includes(booking.status) &&
    !booking.arrivalVerified;
  // Field freelancer can mark complete if arrived
  const canMarkComplete =
    isFreelancer &&
    isField &&
    booking.status === "in_progress" &&
    booking.arrivalVerified;
  // Client sees confirm/dispute when field booking is pending_approval
  const showFieldApproval = isClient && booking.status === "pending_approval";
  // Client can release escrow for digital in_progress
  const canRelease =
    isClient &&
    booking.serviceCategory === "digital" &&
    booking.status === "in_progress" &&
    booking.paymentStatus === "held";

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-bold shadow-xl ${toast.ok !== false ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-red-600 text-white"}`}
        >
          {toast.msg}
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 active:text-slate-900 dark:active:text-white"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                  {booking.serviceType}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}
                >
                  {statusStyle.label}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-400">
                ID: {booking._id.slice(-8)} ·{" "}
                {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${isField ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}
            >
              {isField ? "Field" : "Digital"}
            </span>
          </div>

          {/* Arrival verified banner (field) */}
          {isField && booking.arrivalVerified && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <Navigation size={15} />
              Freelancer arrived at{" "}
              {booking.arrivedAt
                ? new Date(booking.arrivedAt).toLocaleTimeString("en-IN", {
                    timeStyle: "short",
                  })
                : "—"}
            </div>
          )}

          {/* Deadline warning */}
          {deadlineDate &&
            booking.paymentStatus === "held" &&
            booking.status !== "in_progress" && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                <Hourglass size={15} />
                Delivery deadline:{" "}
                {deadlineDate.toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}
              </div>
            )}
        </div>

        {/* Details */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
          <h2 className="mb-4 font-black text-slate-900 dark:text-white">
            Details
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              {
                icon: <IndianRupee size={14} />,
                label: "Amount",
                value: `₹${booking.agreedAmount.toLocaleString("en-IN")}`,
              },
              ...(isField
                ? [
                    {
                      icon: <Calendar size={14} />,
                      label: "Date",
                      value: booking.preferredDate || "—",
                    },
                    {
                      icon: <Clock size={14} />,
                      label: "Time",
                      value: booking.preferredTime || "—",
                    },
                  ]
                : []),
              {
                icon: <MapPin size={14} />,
                label: "Address",
                value: booking.address,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-400">
                  {item.icon} {item.label}
                </div>
                <p className="break-words text-sm font-bold text-slate-800 dark:text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          {booking.issueDescription && (
            <div className="mt-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="mb-1 text-xs font-bold text-slate-400">Notes</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {booking.issueDescription}
              </p>
            </div>
          )}
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              label: "Client",
              person: booking.clientId,
              score: booking.clientId.honorScore,
            },
            {
              label: "Freelancer",
              person: {
                _id: booking.freelancerId._id,
                name: booking.freelancerId.name || "Freelancer",
                email: "",
              },
            },
          ].map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 font-black text-lg text-white dark:bg-white dark:text-slate-900">
                {(p.person.name?.[0] || "?").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {p.label}
                </p>
                <p className="font-black text-slate-900 dark:text-white">
                  {p.person.name}
                </p>
                {p.score !== undefined && <HonorBadge score={p.score} />}
              </div>
            </div>
          ))}
        </div>

        {/* Payment */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
          <div className="mb-4 flex items-center gap-3">
            <CreditCard size={18} className="text-slate-500" />
            <h2 className="font-black text-slate-900 dark:text-white">
              Payment
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Status",
                value:
                  PAYMENT_LABEL[booking.paymentStatus] || booking.paymentStatus,
              },
              {
                label: "In Escrow",
                value: `₹${(booking.escrowAmount || 0).toLocaleString("en-IN")}`,
              },
              {
                label: "Released",
                value: `₹${(booking.releasedAmount || 0).toLocaleString("en-IN")}`,
              },
              {
                label: "Refunded",
                value: `₹${(booking.refundedAmount || 0).toLocaleString("en-IN")}`,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"
              >
                <p className="mb-1 text-xs font-bold text-slate-400">
                  {s.label}
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {autoReleaseDate &&
            booking.status === "in_progress" &&
            booking.paymentStatus === "held" && (
              <p className="mt-3 text-xs font-bold text-slate-400">
                Payment auto-releases on{" "}
                {autoReleaseDate.toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}{" "}
                if no action taken.
              </p>
            )}

          {/* Pay button */}
          {isClient &&
            booking.status === "confirmed" &&
            booking.paymentStatus === "unpaid" && (
              <button
                onClick={initiatePayment}
                disabled={actionLoading === "pay"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white active:bg-emerald-700 disabled:opacity-50"
              >
                {actionLoading === "pay" ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CreditCard size={18} />
                )}
                Pay ₹{booking.agreedAmount.toLocaleString("en-IN")} — Secure
                Escrow
              </button>
            )}
        </div>

        {/* Milestones */}
        {booking.pricingType === "milestone" &&
          booking.milestones.length > 0 && (
            <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
              <h2 className="mb-4 font-black text-slate-900 dark:text-white">
                Milestones
              </h2>
              <div className="space-y-3">
                {[...booking.milestones]
                  .sort((a, b) => a.order - b.order)
                  .map((m) => {
                    const ms = MILESTONE_STYLES[m.status];
                    return (
                      <div
                        key={m._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-black ${ms.bg} ${ms.text}`}
                            >
                              {m.status.replace("_", " ")}
                            </span>
                            <span className="font-black text-slate-900 dark:text-white">
                              {m.title}
                            </span>
                          </div>
                          {m.description && (
                            <p className="text-xs text-slate-500">
                              {m.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-slate-900 dark:text-white">
                            ₹{m.amount.toLocaleString("en-IN")}
                          </span>
                          {isFreelancer && m.status === "pending" && (
                            <button
                              onClick={() =>
                                updateMilestone(m._id, "in_progress")
                              }
                              disabled={!!actionLoading}
                              className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-black text-white active:bg-blue-700 disabled:opacity-50"
                            >
                              Start
                            </button>
                          )}
                          {isFreelancer && m.status === "in_progress" && (
                            <button
                              onClick={() =>
                                updateMilestone(m._id, "submitted")
                              }
                              disabled={!!actionLoading}
                              className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-black text-white active:bg-amber-700 disabled:opacity-50"
                            >
                              Submit
                            </button>
                          )}
                          {isClient && m.status === "submitted" && (
                            <button
                              onClick={() => approveMilestone(m._id)}
                              disabled={!!actionLoading}
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white active:bg-emerald-700 disabled:opacity-50"
                            >
                              {actionLoading === m._id + "approve" ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        {/* Actions */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
          <h2 className="mb-4 font-black text-slate-900 dark:text-white">
            Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {/* Freelancer: Accept/Reject pending booking */}
            {isFreelancer && booking.status === "pending" && (
              <>
                <button
                  onClick={() => updateStatus("confirmed")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white active:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading === "confirmed" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}{" "}
                  Accept
                </button>
                <button
                  onClick={() => updateStatus("cancelled")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white active:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === "cancelled" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}{" "}
                  Reject
                </button>
              </>
            )}

            {/* Field freelancer: Mark arrived (GPS) */}
            {canMarkArrived && (
              <button
                onClick={markArrived}
                disabled={actionLoading === "arrive"}
                className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white active:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === "arrive" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Navigation size={16} />
                )}{" "}
                Mark Arrived
              </button>
            )}

            {/* Field freelancer: Mark complete (requires arrival) */}
            {canMarkComplete && booking.pricingType !== "milestone" && (
              <button
                onClick={() => updateStatus("completed")}
                disabled={!!actionLoading}
                className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white active:bg-indigo-700 disabled:opacity-50"
              >
                {actionLoading === "completed" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <BadgeCheck size={16} />
                )}{" "}
                Mark Completed
              </button>
            )}

            {/* Digital freelancer: Mark delivered */}
            {isFreelancer &&
              !isField &&
              ["confirmed", "in_progress"].includes(booking.status) &&
              booking.pricingType !== "milestone" && (
                <button
                  onClick={() => updateStatus("completed")}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white active:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === "completed" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <BadgeCheck size={16} />
                  )}{" "}
                  Mark Delivered
                </button>
              )}

            {/* Client: Confirm field work (pending_approval) */}
            {showFieldApproval && (
              <>
                <button
                  onClick={confirmField}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white active:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading === "confirm_field" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ThumbsUp size={16} />
                  )}{" "}
                  Confirm Work Done
                </button>
                <button
                  onClick={() => setShowDispute(true)}
                  className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white active:bg-red-700"
                >
                  <ShieldAlert size={16} /> Raise Dispute
                </button>
              </>
            )}

            {/* Client: Release escrow (digital in_progress) */}
            {canRelease && (
              <button
                onClick={releasePayment}
                disabled={actionLoading === "release"}
                className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white active:bg-violet-700 disabled:opacity-50"
              >
                {actionLoading === "release" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}{" "}
                Release Payment
              </button>
            )}

            {/* Client: Leave review on completed */}
            {isClient && booking.status === "completed" && (
              <button className="flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white active:bg-amber-600">
                <Star size={16} fill="currentColor" /> Leave Review
              </button>
            )}

            {/* Dispute button (not already disputed, not pending_approval which has its own) */}
            {!showFieldApproval &&
              (isClient || isFreelancer) &&
              ["confirmed", "in_progress", "completed"].includes(
                booking.status,
              ) &&
              !booking.disputeLocked && (
                <button
                  onClick={() => setShowDispute(true)}
                  className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white active:bg-red-700"
                >
                  <ShieldAlert size={16} /> Raise Dispute
                </button>
              )}

            {/* Dispute locked notice */}
            {booking.disputeLocked && (
              <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-700">
                <ShieldAlert size={16} /> Dispute in progress — booking locked
              </div>
            )}
          </div>
        </div>
      </div>

      {showDispute && (
        <DisputeModal
          bookingId={booking._id}
          onClose={() => {
            setShowDispute(false);
            fetchBooking();
          }}
        />
      )}
    </div>
  );
}
