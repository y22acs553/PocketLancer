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
} from "lucide-react";

export default function BookFreelancerPage() {
  const { freelancerId } = useParams();
  const router = useRouter();
  const { user, loading } = useUser();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Booking form fields
  const [serviceType, setServiceType] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [address, setAddress] = useState("");

  // ✅ Freelancer details
  const [freelancer, setFreelancer] = useState<any>(null);
  const [loadingFreelancer, setLoadingFreelancer] = useState(false);
  const [freelancerError, setFreelancerError] = useState("");

  // 🔒 Route protection
  useEffect(() => {
    if (!loading && (!user || user.role !== "client")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // ✅ Load freelancer summary data
  useEffect(() => {
    const loadFreelancer = async () => {
      if (!freelancerId) return;
      try {
        setLoadingFreelancer(true);
        setFreelancerError("");

        const res = await api.get(`/freelancers/${freelancerId}`);
        setFreelancer(res.data.freelancer ?? res.data);
      } catch (e) {
        setFreelancerError("Unable to load freelancer profile.");
      } finally {
        setLoadingFreelancer(false);
      }
    };

    loadFreelancer();
  }, [freelancerId]);

  const minDate = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const canSubmit = useMemo(() => {
    return (
      serviceType.trim() &&
      preferredDate.trim() &&
      preferredTime.trim() &&
      address.trim() &&
      !submitting
    );
  }, [serviceType, preferredDate, preferredTime, address, submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!serviceType || !preferredDate || !preferredTime || !address) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      await api.post("/bookings", {
        freelancer_id: freelancerId,
        serviceType,
        issueDescription,
        preferredDate,
        preferredTime,
        address,
      });

      router.push("/bookings");
    } catch (err: any) {
      setError(
        err.response?.data?.msg ||
          "Failed to create booking. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  const fName = freelancer?.user?.name || freelancer?.name || "Freelancer";
  const fTitle = freelancer?.title || "Professional";
  const fCity = freelancer?.city || "Unknown";
  const fRate = freelancer?.hourlyRate;
  const fDistance = freelancer?.distanceKm;
  const fRating = freelancer?.rating;
  const fReviews = freelancer?.reviewsCount;
  const fSkills: string[] = freelancer?.skills || [];

  return (
    <div className="min-h-[calc(100vh-80px)] w-full">
      {/* Background container */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="absolute -top-36 -right-36 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-900 hover:bg-slate-50 active:scale-[0.99] dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <div className="text-right">
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Checkout
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Book a freelancer
              </p>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              Confirm Booking
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              Fill the details below. The freelancer will review and confirm.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="relative grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12">
          {/* LEFT: Form */}
          <div className="lg:col-span-8">
            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950"
            >
              {/* Section: Service */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  Service details
                </p>
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Required *
                </p>
              </div>

              {/* Service Type */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  Service Type <span className="text-red-500">*</span>
                </label>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                  <Wrench size={18} className="text-slate-400" />
                  <input
                    type="text"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    placeholder="e.g. AC Repair, Web Development"
                    className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Issue Description */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  Issue Description{" "}
                  <span className="text-slate-400">(optional)</span>
                </label>

                <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                  <FileText size={18} className="mt-0.5 text-slate-400" />
                  <textarea
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Describe your requirement briefly..."
                    rows={5}
                    className="w-full resize-none bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                  />
                </div>

                <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  Add details like brand/model, location floor, urgency etc.
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100 dark:bg-white/10" />

              {/* Section: Schedule */}
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Schedule
              </p>

              {/* Date + Time */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                    Preferred Date <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
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

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
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

              {/* Divider */}
              <div className="h-px bg-slate-100 dark:bg-white/10" />

              {/* Section: Location */}
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Location
              </p>

              {/* Address */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                  Service Address <span className="text-red-500">*</span>
                </label>

                <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                  <MapPin size={18} className="mt-0.5 text-slate-400" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter full service location"
                    rows={4}
                    className="w-full resize-none bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-slate-900"
              >
                {submitting ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    Creating Booking...
                  </span>
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              {/* Freelancer summary */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                      Freelancer
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                      {loadingFreelancer ? "Loading..." : fName}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                      {loadingFreelancer ? "Please wait" : fTitle}
                    </p>
                  </div>

                  <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black dark:bg-white dark:text-slate-900">
                    {(fName || "F").slice(0, 1).toUpperCase()}
                  </div>
                </div>

                {freelancerError && (
                  <p className="mt-3 text-sm font-bold text-red-600">
                    {freelancerError}
                  </p>
                )}

                <div className="mt-4 space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <MapPin size={16} className="text-slate-400" />
                    <span>
                      {fCity}
                      {typeof fDistance === "number"
                        ? ` · ${fDistance} km`
                        : ""}
                    </span>
                  </div>

                  {typeof fRate === "number" && (
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                      <span className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">
                        Hourly Rate
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        ₹{fRate}/hr
                      </span>
                    </div>
                  )}

                  {typeof fRating === "number" && (
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-amber-500" />
                      <span className="text-slate-900 dark:text-white font-black">
                        {fRating.toFixed(1)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        ({fReviews ?? 0} reviews)
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    <BadgeCheck size={16} className="text-blue-500" />
                    Verified Freelancer
                  </div>
                </div>

                {/* Skills */}
                {Array.isArray(fSkills) && fSkills.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                      Skills
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {fSkills.slice(0, 8).map((s) => (
                        <span
                          key={s}
                          className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Booking summary */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Booking Summary
                </h3>

                <div className="mt-4 space-y-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Service
                    </span>
                    <span className="truncate text-right">
                      {serviceType || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Date
                    </span>
                    <span>{preferredDate || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500 dark:text-slate-400">
                      Time
                    </span>
                    <span>{preferredTime || "—"}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                  <p className="flex items-start gap-2 text-xs font-extrabold text-slate-600 dark:text-slate-200">
                    <ShieldCheck
                      size={16}
                      className="mt-0.5 text-emerald-500"
                    />
                    Your request is protected. You can cancel anytime before the
                    freelancer confirms.
                  </p>
                </div>
              </div>

              {/* Tip */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  Tip
                </p>
                <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  Add clear details in description (problem + expectation). This
                  improves acceptance rate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
