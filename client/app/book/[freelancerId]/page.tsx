"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";

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

  // 🔒 Route protection
  useEffect(() => {
    if (!loading && (!user || user.role !== "client")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

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

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-3xl font-semibold text-slate-900">
        Book Freelancer
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
      >
        {/* Service Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Service Type *
          </label>
          <input
            type="text"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="e.g. AC Repair, Web Development"
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Issue Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Issue Description
          </label>
          <textarea
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Describe your requirement (optional)"
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Preferred Date *
          </label>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Preferred Time *
          </label>
          <input
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Service Address *
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter service location"
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 p-2 focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-primary px-4 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {submitting ? "Creating Booking..." : "Confirm Booking"}
        </button>
      </form>
    </div>
  );
}
