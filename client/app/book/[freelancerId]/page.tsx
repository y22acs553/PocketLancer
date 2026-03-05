"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import {
  CalendarDays,
  Clock,
  MapPin,
  Wrench,
  FileText,
  ArrowLeft,
  ShieldCheck,
  Star,
  BadgeCheck,
  Loader2,
  CreditCard,
  Zap,
  Globe,
  IndianRupee,
  Lock,
  CheckCircle2,
  HelpCircle,
  Timer,
  Plus,
  Minus,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type DigitalPayMode = "advance" | "hours";

export default function BookFreelancerPage() {
  const params = useParams();
  const freelancerId = params?.freelancerId?.toString();
  const router = useRouter();
  const { user, loading } = useUser();

  const [submitting, setSubmitting] = useState(false);
  const [paymentPhase, setPaymentPhase] = useState<
    "idle" | "creating" | "paying" | "verifying"
  >("idle");
  const [error, setError] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [address, setAddress] = useState("");
  const [freelancer, setFreelancer] = useState<any>(null);
  const [loadingFreelancer, setLoadingFreelancer] = useState(false);
  const [freelancerError, setFreelancerError] = useState("");

  // ── Digital-specific state ──────────────────────────
  const [digitalPayMode, setDigitalPayMode] =
    useState<DigitalPayMode>("advance");
  const [estimatedHours, setEstimatedHours] = useState(1);

  useEffect(() => {
    if (!loading && (!user || user.role !== "client")) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (document.getElementById("rzp-sdk")) return;
    const s = document.createElement("script");
    s.id = "rzp-sdk";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!freelancerId) return;
    setLoadingFreelancer(true);
    api
      .get(`/freelancers/${freelancerId}`)
      .then((r) => setFreelancer(r.data.profile ?? r.data.freelancer ?? r.data))
      .catch(() => setFreelancerError("Unable to load freelancer profile."))
      .finally(() => setLoadingFreelancer(false));
  }, [freelancerId]);

  const isDigital = freelancer?.category === "digital";
  const isHourlyDigital =
    isDigital &&
    (freelancer?.pricingType === "hourly" || !freelancer?.pricingType);

  const minDate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // ── Compute amount to charge based on mode ──────────
  const agreedAmount = useMemo(() => {
    if (!freelancer) return 0;

    if (isHourlyDigital) {
      if (digitalPayMode === "advance") {
        return freelancer.advanceAmount || 0;
      }
      // hours mode
      return parseFloat(
        (estimatedHours * (freelancer.hourlyRate || 0)).toFixed(2),
      );
    }

    if (freelancer.pricingType === "fixed") return freelancer.fixedPrice || 0;
    if (freelancer.pricingType === "milestone")
      return (freelancer.milestones || []).reduce(
        (s: number, m: any) => s + m.amount,
        0,
      );
    // fallback hourly (non-digital)
    return freelancer.hourlyRate || 0;
  }, [freelancer, digitalPayMode, estimatedHours, isHourlyDigital]);

  const canSubmit = useMemo(() => {
    if (submitting || !serviceType.trim()) return false;
    // Phone must be added for digital bookings (payment required)
    if (isDigital && (!user?.phone || !user.phone.trim())) return false;

    if (!isDigital) return !!(preferredDate && preferredTime && address.trim());
    if (isHourlyDigital) {
      if (digitalPayMode === "advance")
        return (freelancer?.advanceAmount || 0) > 0;
      return estimatedHours > 0;
    }
    return true;
  }, [
    serviceType,
    preferredDate,
    preferredTime,
    address,
    submitting,
    isDigital,
    isHourlyDigital,
    digitalPayMode,
    estimatedHours,
    freelancer,
    user?.phone,
  ]);

  // ── Digital booking handler ──────────────────────────
  const handleDigitalBooking = async () => {
    setError("");
    setSubmitting(true);
    setPaymentPhase("creating");
    try {
      const body: any = {
        freelancer_id: freelancerId,
        serviceType,
        issueDescription,
      };

      if (isHourlyDigital) {
        if (digitalPayMode === "advance") {
          body.advancePayment = true;
        } else {
          body.estimatedHours = estimatedHours;
        }
      }

      const bookRes = await api.post("/bookings", body);
      const booking = bookRes.data.booking;
      const orderRes = await api.post(
        `/bookings/${booking._id}/payment/create-order`,
      );
      const { razorpayOrderId, amount, currency, keyId } = orderRes.data;
      setPaymentPhase("paying");
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency,
          name: "PocketLancer",
          description: `Booking: ${serviceType}`,
          order_id: razorpayOrderId,
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
            contact: user?.phone || "",
          },
          theme: { color: "#7c3aed" },
          handler: async (response: any) => {
            setPaymentPhase("verifying");
            try {
              await api.post(`/bookings/${booking._id}/payment/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              router.push(
                `/payment/success?bookingId=${booking._id}&paymentId=${response.razorpay_payment_id}&amount=${agreedAmount}&service=${encodeURIComponent(serviceType)}`,
              );
              resolve();
            } catch {
              reject(new Error("Verification failed"));
            }
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              setPaymentPhase("idle");
              reject(new Error("dismissed"));
            },
          },
        });
        rzp.on("payment.failed", (r: any) =>
          reject(new Error(r.error?.description || "Payment failed")),
        );
        rzp.open();
      });
    } catch (err: any) {
      if (err?.message !== "dismissed")
        setError(err?.response?.data?.msg || err?.message || "Booking failed.");
      setSubmitting(false);
      setPaymentPhase("idle");
    }
  };

  const handleFieldBooking = async () => {
    setError("");
    if (!serviceType || !preferredDate || !preferredTime || !address) {
      setError("Please fill all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/bookings", {
        freelancer_id: freelancerId,
        serviceType,
        issueDescription,
        preferredDate,
        preferredTime,
        address,
      });
      router.push("/bookings?toast=booking_created");
    } catch (err: any) {
      setError(err.response?.data?.msg || "Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isDigital ? handleDigitalBooking() : handleFieldBooking();
  };

  if (loading || !user) return null;

  const fName = freelancer?.user?.name || freelancer?.name || "Freelancer";
  const fTitle = freelancer?.title || "Professional";
  const fCity = freelancer?.city || "";
  const fRate = freelancer?.hourlyRate;
  const fRating = freelancer?.rating;
  const fReviews = freelancer?.reviewsCount ?? 0;
  const fSkills: string[] = freelancer?.skills || [];
  const pricingType = freelancer?.pricingType || "hourly";

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="pointer-events-none absolute -top-36 -right-36 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              <ArrowLeft size={16} /> Back
            </button>
            {!loadingFreelancer && freelancer && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black ring-1 ${isDigital ? "bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300" : "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300"}`}
              >
                {isDigital ? (
                  <>
                    <Globe size={12} /> Digital Service
                  </>
                ) : (
                  <>
                    <MapPin size={12} /> Field Service
                  </>
                )}
              </span>
            )}
          </div>
          <div className="mt-5">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              Confirm Booking
            </h1>
            {!loadingFreelancer && freelancer && (
              <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                {isDigital
                  ? "Your payment is held in escrow — released only after you approve the work."
                  : "Book your slot for free. Pay the freelancer directly at the location."}
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="relative grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12">
          {/* Form */}
          <div className="lg:col-span-8">
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  Service details
                </p>
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Required *
                </span>
              </div>

              {/* Service Type */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                  <Wrench size={18} className="flex-shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    placeholder={
                      isDigital
                        ? "e.g. Logo Design, Web Dev, Video Editing"
                        : "e.g. AC Repair, Plumbing, Electrical"
                    }
                    className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  Description{" "}
                  <span className="text-xs font-bold text-slate-400">
                    (optional)
                  </span>
                </label>
                <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                  <FileText
                    size={18}
                    className="mt-0.5 flex-shrink-0 text-slate-400"
                  />
                  <textarea
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder={
                      isDigital
                        ? "Describe your project — deliverables, style, deadline…"
                        : "Brand/model, floor, urgency, special instructions…"
                    }
                    rows={4}
                    className="w-full resize-none bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                </div>
              </div>

              {/* ── DIGITAL HOURLY: Payment Mode Selector ── */}
              {isHourlyDigital && (
                <div className="space-y-4">
                  <div className="h-px bg-slate-100 dark:bg-white/10" />

                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white mb-1">
                      Do you know how long the work will take?
                    </p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      If you've already discussed the timeline with the
                      freelancer, select "Yes".
                    </p>
                  </div>

                  {/* Toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDigitalPayMode("advance")}
                      className={`rounded-2xl px-4 py-3 text-sm font-black transition border ${
                        digitalPayMode === "advance"
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-800"
                      }`}
                    >
                      <HelpCircle
                        size={16}
                        className="inline-block mr-2 mb-0.5"
                      />
                      Not Sure
                      <p className="text-[10px] font-bold mt-0.5 opacity-75">
                        Pay advance
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDigitalPayMode("hours")}
                      className={`rounded-2xl px-4 py-3 text-sm font-black transition border ${
                        digitalPayMode === "hours"
                          ? "bg-violet-600 text-white border-violet-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-800"
                      }`}
                    >
                      <Timer size={16} className="inline-block mr-2 mb-0.5" />
                      Yes, I know
                      <p className="text-[10px] font-bold mt-0.5 opacity-75">
                        Pay for hours
                      </p>
                    </button>
                  </div>

                  {/* Advance mode info */}
                  {digitalPayMode === "advance" && (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/20 dark:bg-violet-500/10">
                      <div className="flex items-start gap-3">
                        <IndianRupee
                          size={18}
                          className="mt-0.5 flex-shrink-0 text-violet-600 dark:text-violet-400"
                        />
                        <div>
                          <p className="text-sm font-black text-violet-900 dark:text-violet-100">
                            Advance Payment
                          </p>
                          <p className="mt-1 text-xs font-bold leading-relaxed text-violet-700 dark:text-violet-300">
                            You'll pay ₹
                            {(freelancer?.advanceAmount || 0).toLocaleString(
                              "en-IN",
                            )}{" "}
                            as advance. The freelancer will contact you to
                            discuss the full scope and remaining payment after
                            the work begins.
                          </p>
                          {(freelancer?.advanceAmount || 0) === 0 && (
                            <p className="mt-2 text-xs font-black text-red-600 dark:text-red-400">
                              ⚠ This freelancer has not set an advance amount.
                              Please message them first.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hours mode */}
                  {digitalPayMode === "hours" && (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                          Estimated Hours{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              setEstimatedHours((h) => Math.max(1, h - 1))
                            }
                            className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-700 dark:text-white"
                          >
                            <Minus size={16} />
                          </button>
                          <div className="flex-1 text-center">
                            <span className="text-2xl font-black text-slate-900 dark:text-white">
                              {estimatedHours}
                            </span>
                            <span className="text-sm font-bold text-slate-500 ml-2">
                              {estimatedHours === 1 ? "hour" : "hours"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setEstimatedHours((h) => Math.min(100, h + 1))
                            }
                            className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-700 dark:text-white"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Calculation */}
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                          {estimatedHours} hr × ₹
                          {(freelancer?.hourlyRate || 0).toLocaleString(
                            "en-IN",
                          )}
                          /hr
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          = ₹{agreedAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Field-only: date, time, address */}
              {!isDigital && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-white/10" />
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Schedule
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                        Preferred Date <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                        <CalendarDays size={18} className="text-slate-400" />
                        <input
                          type="date"
                          value={preferredDate}
                          min={minDate}
                          onChange={(e) => setPreferredDate(e.target.value)}
                          className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                        Preferred Time <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                        <Clock size={18} className="text-slate-400" />
                        <input
                          type="time"
                          value={preferredTime}
                          onChange={(e) => setPreferredTime(e.target.value)}
                          className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 dark:bg-white/10" />
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Service Location
                  </p>
                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Full Address <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-violet-500 dark:border-white/10 dark:bg-slate-900">
                      <MapPin
                        size={18}
                        className="mt-0.5 flex-shrink-0 text-slate-400"
                      />
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Door/flat no., street, area, landmark, city…"
                        rows={3}
                        className="w-full resize-none bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Escrow banner (digital non-hourly or hourly with mode selected) */}
              {isDigital && !isHourlyDigital && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/20 dark:bg-violet-500/10">
                  <div className="flex items-start gap-3">
                    <Lock
                      size={18}
                      className="mt-0.5 flex-shrink-0 text-violet-600 dark:text-violet-400"
                    />
                    <div>
                      <p className="text-sm font-black text-violet-900 dark:text-violet-100">
                        Escrow Payment Protection
                      </p>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-violet-700 dark:text-violet-300">
                        Your payment is locked securely. Released to freelancer
                        only after you approve their work. Raise a dispute
                        within 7 days of delivery if unsatisfied.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pay-at-location banner (field) */}
              {!isDigital && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <div className="flex items-start gap-3">
                    <Zap
                      size={18}
                      className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                    />
                    <div>
                      <p className="text-sm font-black text-amber-900 dark:text-amber-100">
                        Pay at Location — No online payment needed
                      </p>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-amber-700 dark:text-amber-300">
                        Booking is completely free. Pay the freelancer directly
                        at the site (cash or UPI). Always confirm final price
                        before work begins.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              )}

              {/* Phone Warning for Digital Bookings */}
              {isDigital && (!user?.phone || !user.phone.trim()) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/20 dark:bg-amber-500/10 mb-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={18}
                      className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"
                    />
                    <div>
                      <p className="text-sm font-black text-amber-900 dark:text-amber-100">
                        Mobile Number Required
                      </p>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-amber-700 dark:text-amber-300">
                        Please update your profile with a valid mobile number before making a payment.
                      </p>
                      <button
                        type="button"
                        onClick={() => router.push("/client/profile")}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-black text-white hover:bg-amber-700"
                      >
                        Update Profile
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full rounded-2xl px-5 py-4 text-sm font-black text-white shadow-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${isDigital ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900"}`}
              >
                {submitting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    {paymentPhase === "creating"
                      ? "Creating booking…"
                      : paymentPhase === "paying"
                        ? "Opening payment…"
                        : "Verifying payment…"}
                  </span>
                ) : isDigital ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <CreditCard size={18} />
                    Pay ₹{agreedAmount.toLocaleString("en-IN")}{" "}
                    {isHourlyDigital && digitalPayMode === "advance"
                      ? "(Advance)"
                      : isHourlyDigital && digitalPayMode === "hours"
                        ? `(${estimatedHours}h)`
                        : ""}{" "}
                    &amp; Confirm
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Confirm — Pay at Location
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              {/* Freelancer summary */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                {loadingFreelancer ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <Loader2 className="animate-spin" size={16} /> Loading…
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                          Freelancer
                        </p>
                        <h3 className="mt-1 truncate text-lg font-black text-slate-900 dark:text-white">
                          {fName}
                        </h3>
                        <p className="mt-0.5 truncate text-sm font-bold text-slate-500 dark:text-slate-400">
                          {fTitle}
                        </p>
                      </div>
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-900 font-black text-white dark:bg-white dark:text-slate-900">
                        {(fName || "F").slice(0, 1).toUpperCase()}
                      </div>
                    </div>
                    {freelancerError && (
                      <p className="mt-2 text-sm font-bold text-red-600">
                        {freelancerError}
                      </p>
                    )}
                    <div className="mt-4 space-y-2">
                      {fCity && (
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                          <MapPin size={14} className="text-slate-400" />
                          {fCity}
                        </div>
                      )}
                      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                        <span className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">
                          {pricingType === "fixed"
                            ? "Fixed Price"
                            : pricingType === "milestone"
                              ? "Milestone Total"
                              : "Hourly Rate"}
                        </span>
                        <span className="flex items-center gap-0.5 text-sm font-black text-slate-900 dark:text-white">
                          <IndianRupee size={13} />
                          {pricingType === "hourly"
                            ? `${fRate || 0}/hr`
                            : agreedAmount.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Show advance amount for hourly digital */}
                      {isHourlyDigital &&
                        (freelancer?.advanceAmount || 0) > 0 && (
                          <div className="flex items-center justify-between rounded-2xl bg-violet-50 dark:bg-violet-900/20 px-4 py-3 ring-1 ring-violet-500/20">
                            <span className="text-xs font-extrabold uppercase text-violet-600 dark:text-violet-400">
                              Advance Amount
                            </span>
                            <span className="flex items-center gap-0.5 text-sm font-black text-violet-700 dark:text-violet-300">
                              <IndianRupee size={13} />
                              {freelancer.advanceAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}

                      {typeof fRating === "number" && (
                        <div className="flex items-center gap-2">
                          <Star
                            size={14}
                            className="text-amber-500"
                            fill="currentColor"
                          />
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            {fRating.toFixed(1)}
                          </span>
                          <span className="text-sm font-bold text-slate-500">
                            ({fReviews} reviews)
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                        <BadgeCheck size={14} className="text-blue-500" />{" "}
                        Verified Freelancer
                      </div>
                    </div>
                    {fSkills.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                          Skills
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {fSkills.slice(0, 6).map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Payment flow explanation */}
              {!loadingFreelancer && freelancer && (
                <div
                  className={`rounded-3xl p-6 ${isDigital ? "bg-violet-600 text-white" : "border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"}`}
                >
                  <p
                    className={`flex items-center gap-2 text-sm font-black ${isDigital ? "text-white" : "text-amber-900 dark:text-amber-100"}`}
                  >
                    {isDigital ? (
                      <>
                        <Lock size={15} /> How Escrow Works
                      </>
                    ) : (
                      <>
                        <Zap size={15} /> How Payment Works
                      </>
                    )}
                  </p>
                  <ol className="mt-3 space-y-2">
                    {(isDigital
                      ? isHourlyDigital && digitalPayMode === "advance"
                        ? [
                            "Pay advance — funds locked securely",
                            "Freelancer contacts you to discuss scope",
                            "Work completed, remaining amount settled",
                            "Approve & release payment to freelancer",
                            "Auto-release after 7 days if no action",
                          ]
                        : [
                            "Pay now — funds locked securely",
                            "Freelancer works on your project",
                            "Review & approve the work",
                            "Payment released to freelancer",
                            "Auto-release after 7 days if no action",
                          ]
                      : [
                          "Book your slot — completely free",
                          "Freelancer confirms & visits",
                          "Work completed at your location",
                          "Pay freelancer directly (cash/UPI)",
                        ]
                    ).map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${isDigital ? "bg-white/20 text-white" : "bg-amber-600 text-white"}`}
                        >
                          {i + 1}
                        </span>
                        <span
                          className={`text-xs font-bold leading-relaxed ${isDigital ? "text-violet-100" : "text-amber-800 dark:text-amber-200"}`}
                        >
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Field booking preview */}
              {!isDigital && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Booking Summary
                  </p>
                  <div className="mt-3 space-y-2 text-sm font-bold">
                    {[
                      ["Service", serviceType || "—"],
                      ["Date", preferredDate || "—"],
                      ["Time", preferredTime || "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <span className="text-slate-500">{k}</span>
                        <span className="truncate text-right text-slate-900 dark:text-white">
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                    <ShieldCheck
                      size={14}
                      className="mt-0.5 flex-shrink-0 text-emerald-500"
                    />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Cancel anytime before the freelancer confirms.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
