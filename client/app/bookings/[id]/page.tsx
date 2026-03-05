"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import DisputeModal from "@/components/DisputeModal";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  CheckCircle2,
  XCircle,
  Loader2,
  BadgeCheck,
  ShieldAlert,
  CreditCard,
  Star,
  AlertTriangle,
  IndianRupee,
  Timer,
  User,
  ChevronRight,
} from "lucide-react";

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
  releasedAt?: string;
}

interface Booking {
  _id: string;
  serviceType: string;
  issueDescription: string;
  preferredDate: string;
  preferredTime: string;
  address: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "disputed";
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
  clientId: { _id: string; name: string; email: string; avatar?: string };
  freelancerId: {
    _id: string;
    title: string;
    user: string;
    profilePic?: string;
    name?: string;
  };
  createdAt: string;
}

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
    bg: "bg-amber-100 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
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
};

const MILESTONE_STYLES: Record<MilestoneStatus, { bg: string; text: string }> =
  {
    pending: { bg: "bg-slate-100", text: "text-slate-500" },
    in_progress: { bg: "bg-blue-100", text: "text-blue-600" },
    submitted: { bg: "bg-amber-100", text: "text-amber-700" },
    approved: { bg: "bg-emerald-100", text: "text-emerald-700" },
    released: { bg: "bg-emerald-200", text: "text-emerald-800" },
  };

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
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
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const updateStatus = async (status: string) => {
    try {
      setActionLoading(status);
      await api.patch(`/bookings/${id}/status`, { status });
      setBooking((b) => (b ? { ...b, status: status as any } : b));
      showToast(`Booking ${status}`);
    } catch (err: any) {
      showToast(err.response?.data?.msg || "Failed");
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
      showToast("Failed to update milestone");
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
      showToast("Failed to approve milestone");
    } finally {
      setActionLoading("");
    }
  };

  const initiatePayment = async () => {
    try {
      setActionLoading("pay");
      const res = await api.post("/payments/order", { bookingId: id });
      const { order, key } = res.data;

      const rzp = new (window as any).Razorpay({
        key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "PocketLancer",
        description: booking?.serviceType,
        handler: async (response: any) => {
          await api.post("/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            bookingId: id,
          });
          await fetchBooking();
          showToast("Payment successful! Funds held in escrow.");
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: "#0f172a" },
      });
      rzp.open();
    } catch (err: any) {
      showToast(err.response?.data?.msg || "Payment initiation failed");
    } finally {
      setActionLoading("");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-slate-400" />
      </div>
    );

  if (error || !booking)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle size={48} className="text-red-400" />
        <p className="font-bold text-slate-600">
          {error || "Booking not found"}
        </p>
        <button
          onClick={() => router.back()}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white"
        >
          Go back
        </button>
      </div>
    );

  const isClient = user?._id === booking.clientId._id;
  const isFreelancer = !isClient;
  const statusStyle = STATUS_STYLES[booking.status] || STATUS_STYLES.pending;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-slate-900 px-5 py-3 text-white font-bold shadow-xl dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
        >
          <ArrowLeft size={16} /> Back to bookings
        </button>

        {/* Header card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6 lg:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  {booking.serviceType}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${statusStyle.bg} ${statusStyle.text}`}
                >
                  {statusStyle.label}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                ID: {booking._id}
              </p>
            </div>

            {/* Amount */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 px-5 py-4 text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Agreed amount
              </p>
              <p className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-end gap-1 mt-1">
                <IndianRupee size={20} />
                {booking.agreedAmount.toLocaleString("en-IN")}
              </p>
              <p className="text-xs font-bold text-slate-400 mt-1 capitalize">
                {booking.pricingType} pricing
              </p>
            </div>
          </div>

          {/* Meta grid */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: <Calendar size={15} />,
                label: "Date",
                value: new Date(booking.preferredDate).toLocaleDateString(
                  undefined,
                  { dateStyle: "medium" },
                ),
              },
              {
                icon: <Clock size={15} />,
                label: "Time",
                value: booking.preferredTime,
              },
              {
                icon: <Timer size={15} />,
                label: "Duration",
                value: `${booking.estimatedDurationMinutes} min`,
              },
              {
                icon: <MapPin size={15} />,
                label: "Address",
                value: booking.address,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5">
                  {item.icon} {item.label}
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white break-words">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {booking.issueDescription && (
            <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800 p-4">
              <p className="text-xs font-bold text-slate-400 mb-1">Notes</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {booking.issueDescription}
              </p>
            </div>
          )}
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Client", person: booking.clientId },
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
              className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 p-5 flex items-center gap-4"
            >
              <div className="h-12 w-12 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 font-black text-lg flex-shrink-0">
                {(p.person.name?.[0] || "?").toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {p.label}
                </p>
                <p className="font-black text-slate-900 dark:text-white">
                  {p.person.name}
                </p>
                {p.person.email && (
                  <p className="text-xs text-slate-500">{p.person.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Payment status */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard size={20} className="text-slate-500" />
            <h2 className="font-black text-slate-900 dark:text-white">
              Payment & Escrow
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4"
              >
                <p className="text-xs font-bold text-slate-400 mb-1">
                  {s.label}
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Pay button for client */}
          {isClient &&
            booking.status === "confirmed" &&
            booking.paymentStatus === "unpaid" && (
              <button
                onClick={initiatePayment}
                disabled={actionLoading === "pay"}
                className="mt-5 w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
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
            <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6">
              <h2 className="font-black text-slate-900 dark:text-white mb-4">
                Milestones
              </h2>
              <div className="space-y-3">
                {booking.milestones
                  .sort((a, b) => a.order - b.order)
                  .map((m) => {
                    const ms = MILESTONE_STYLES[m.status];
                    return (
                      <div
                        key={m._id}
                        className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
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
                              className="rounded-xl bg-blue-600 text-white text-xs font-black px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50"
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
                              className="rounded-xl bg-amber-600 text-white text-xs font-black px-3 py-1.5 hover:bg-amber-700 disabled:opacity-50"
                            >
                              Submit
                            </button>
                          )}
                          {isClient && m.status === "submitted" && (
                            <button
                              onClick={() => approveMilestone(m._id)}
                              disabled={!!actionLoading}
                              className="rounded-xl bg-emerald-600 text-white text-xs font-black px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-50"
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
        <div className="rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6">
          <h2 className="font-black text-slate-900 dark:text-white mb-4">
            Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            {isFreelancer && booking.status === "pending" && (
              <>
                <button
                  onClick={() => updateStatus("confirmed")}
                  disabled={!!actionLoading}
                  className="rounded-2xl bg-emerald-600 text-white text-sm font-black px-5 py-3 hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
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
                  className="rounded-2xl bg-red-600 text-white text-sm font-black px-5 py-3 hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
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
            {isFreelancer &&
              booking.status === "confirmed" &&
              booking.pricingType !== "milestone" && (
                <button
                  onClick={() => updateStatus("completed")}
                  disabled={!!actionLoading}
                  className="rounded-2xl bg-blue-600 text-white text-sm font-black px-5 py-3 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === "completed" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <BadgeCheck size={16} />
                  )}{" "}
                  Mark Completed
                </button>
              )}
            {isClient && booking.status === "completed" && (
              <button
                onClick={() => {}}
                className="rounded-2xl bg-amber-500 text-white text-sm font-black px-5 py-3 hover:bg-amber-600 flex items-center gap-2"
              >
                <Star size={16} fill="currentColor" /> Leave Review
              </button>
            )}
            {(isClient || isFreelancer) &&
              ["confirmed", "completed"].includes(booking.status) &&
              !booking.disputeLocked && (
                <button
                  onClick={() => setShowDispute(true)}
                  className="rounded-2xl bg-red-600 text-white text-sm font-black px-5 py-3 hover:bg-red-700 flex items-center gap-2"
                >
                  <ShieldAlert size={16} /> Raise Dispute
                </button>
              )}
            {booking.disputeLocked && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-5 py-3 text-sm font-bold ring-1 ring-amber-200 dark:ring-amber-700">
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
