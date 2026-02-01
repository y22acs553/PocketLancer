"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import ReviewModal from "@/components/ReviewModal";

export default function MyBookingsPage() {
  const router = useRouter();
  const { user } = useUser();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showReview, setShowReview] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const updateStatus = async (bookingId, status) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });

      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status } : b)),
      );
    } catch (err) {
      console.error(
        "Update status failed:",
        err?.response?.data || err?.message || err,
      );

      const msg =
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        "Failed to update booking status.";
      alert(msg);

      // Optional: redirect on auth failure
      if (err?.response?.status === 401) router.push("/login");
    }
  };

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get("/bookings/mybookings");
        setBookings(res.data?.data || []);
      } catch (err) {
        if (err?.response?.status === 401) router.push("/login");
        else console.error("Fetch bookings failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [router]);

  if (loading) return <p className="p-6">Loading bookings...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>

      {bookings.length === 0 && (
        <p className="text-slate-600">No bookings found.</p>
      )}

      {bookings.map((b) => (
        <div key={b._id} className="border p-4 mb-4 rounded-xl bg-white">
          <p>
            <b>Service:</b> {b.serviceType}
          </p>

          <p>
            <b>Client:</b> {b.clientId?.name || "Unknown"}
          </p>

          <p>
            <b>Date:</b>{" "}
            {b.startTime
              ? new Date(b.startTime).toDateString()
              : b.preferredDate}
          </p>

          <p>
            <b>Time:</b>{" "}
            {b.startTime
              ? new Date(b.startTime).toLocaleTimeString()
              : b.preferredTime}
            {"  "}
            {b.endTime ? `– ${new Date(b.endTime).toLocaleTimeString()}` : ""}
          </p>

          <p>
            <b>Duration:</b> {b.estimatedDurationMinutes ?? "-"} mins
          </p>

          <p>
            <b>Status:</b>{" "}
            <span className="font-semibold uppercase">{b.status}</span>
          </p>

          {/* ✅ Actions for freelancer */}
          {user?.role === "freelancer" && b.status === "pending" && (
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => updateStatus(b._id, "confirmed")}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Accept
              </button>

              <button
                type="button"
                onClick={() => updateStatus(b._id, "cancelled")}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Reject
              </button>
            </div>
          )}

          {user?.role === "freelancer" && b.status === "confirmed" && (
            <button
              type="button"
              onClick={() => updateStatus(b._id, "completed")}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Mark Completed
            </button>
          )}

          {/* ✅ Review for client */}
          {user?.role === "client" && b.status === "completed" && (
            <button
              type="button"
              onClick={() => {
                setSelectedBooking(b._id);
                setShowReview(true);
              }}
              className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Leave Review
            </button>
          )}
        </div>
      ))}

      {showReview && selectedBooking && (
        <ReviewModal
          bookingId={selectedBooking}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
}
