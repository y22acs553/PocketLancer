"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import ReviewModal from "@/components/ReviewModal";
import {
  Calendar,
  Clock,
  Star,
  Loader2,
  Briefcase,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useUser } from "@/context/UserContext";

interface Booking {
  _id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
}

// Keep this named 'cn'
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ensure this is the ONLY 'MyBookingsPage' declaration in the file
export default function MyBookingsPage() {
  const router = useRouter();
  const { user } = useUser();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get("/bookings/mybookings");
        setBookings(res.data.data || []);
      } catch (err: any) {
        if (err.response?.status === 401) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [router]);

  const updateStatus = async (
    bookingId: string,
    status: "confirmed" | "completed" | "cancelled",
  ) => {
    await api.patch(`/bookings/${bookingId}/status`, { status });

    setBookings((prev) =>
      prev.map((b) => (b._id === bookingId ? { ...b, status } : b)),
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-slate-500">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="font-medium">Loading your schedule...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          My Bookings
        </h1>
        <p className="text-slate-500 mt-2">
          View and manage your service history.
        </p>
      </header>

      {bookings.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
          <Briefcase className="mx-auto text-slate-300 mb-4" size={64} />
          <p className="text-slate-500 text-xl font-medium">
            No bookings found yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                      <Briefcase size={24} />
                    </div>
                    <h3 className="font-bold text-xl text-slate-800">
                      {b.serviceType}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-5 text-sm font-medium text-slate-500">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Calendar size={16} />
                      {new Date(b.preferredDate).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Clock size={16} />
                      {b.preferredTime}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                  <span
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border",
                      b.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : b.status === "confirmed"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                          : b.status === "cancelled"
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-blue-50 text-blue-700 border-blue-100",
                    )}
                  >
                    {b.status}
                  </span>

                  {/* FREELANCER ACTIONS */}
                  {user?.role === "freelancer" && b.status === "pending" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => updateStatus(b._id, "confirmed")}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600"
                      >
                        <CheckCircle size={18} />
                        Accept
                      </button>

                      <button
                        onClick={() => updateStatus(b._id, "cancelled")}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                    </div>
                  )}

                  {user?.role === "freelancer" && b.status === "confirmed" && (
                    <button
                      onClick={() => updateStatus(b._id, "completed")}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700"
                    >
                      <CheckCircle size={18} />
                      Mark Completed
                    </button>
                  )}

                  {/* CLIENT REVIEW */}
                  {user?.role === "client" && b.status === "completed" && (
                    <button
                      onClick={() => {
                        setSelectedBooking(b._id);
                        setShowReview(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-100"
                    >
                      <Star size={18} fill="currentColor" />
                      Leave Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showReview && selectedBooking && (
        <ReviewModal
          bookingId={selectedBooking}
          onClose={() => setShowReview(false)}
        />
      )}
    </div>
  );
}
