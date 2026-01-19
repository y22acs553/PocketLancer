"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import ReviewModal from "@/components/ReviewModal";

export default function MyBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });

      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status } : b)),
      );
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to update booking status");
    }
  };

  useEffect(() => {
    api
      .get("/bookings/mybookings")
      .then((res) => setBookings(res.data.data))
      .catch((err) => {
        if (err.response?.status === 401) router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p>Loading bookings...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>

      {bookings.length === 0 && <p>No bookings found.</p>}

      {bookings.map((b) => (
        <div key={b._id} className="border p-4 mb-3 rounded">
          <p>
            <b>Service:</b> {b.serviceType}
          </p>

          <p>
            <b>Client:</b> {b.clientId?.name}
          </p>

          <p>
            <b>Date:</b> {new Date(b.startTime).toDateString()}
          </p>

          <p>
            <b>Time:</b> {new Date(b.startTime).toLocaleTimeString()} –{" "}
            {new Date(b.endTime).toLocaleTimeString()}
          </p>

          <p>
            <b>Duration:</b> {b.estimatedDurationMinutes} mins
          </p>

          <p>
            <b>Status:</b> <span className="font-semibold">{b.status}</span>
          </p>

          {b.status === "pending" && (
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => updateStatus(b._id, "confirmed")}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Accept
              </button>

              <button
                onClick={() => updateStatus(b._id, "cancelled")}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Reject
              </button>
            </div>
          )}

          {b.status === "completed" && (
            <button
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
    </div>
  );
}
