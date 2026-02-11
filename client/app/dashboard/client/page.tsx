"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import GetLocationButton from "@/components/GetLocationButton";
import { useUser } from "@/context/UserContext";
import {
  Search,
  CalendarCheck2,
  Star,
  Loader2,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

type Booking = {
  _id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
};

export default function ClientDashboard() {
  const { user } = useUser();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const res = await api.get("/bookings/mybookings");
        setBookings(res.data?.data || []);
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    return { total, completed, confirmed, pending };
  }, [bookings]);

  const cardClass =
    "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-all";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-8 text-white shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm text-slate-200 font-bold">Welcome back</p>
            <h2 className="text-3xl font-extrabold mt-1">
              {user?.name || "Client"}
            </h2>
            <p className="text-slate-200 mt-2">
              Find verified freelancers near you and book instantly.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/search")}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-extrabold text-slate-900 hover:bg-slate-100"
            >
              <Search size={18} />
              Find Freelancers
            </button>

            <button
              onClick={() => router.push("/bookings")}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-5 py-3 font-extrabold text-white hover:bg-white/10"
            >
              <CalendarCheck2 size={18} />
              My Bookings
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={cardClass}>
          <p className="text-xs font-extrabold tracking-widest text-slate-400">
            TOTAL BOOKINGS
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {stats.total}
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-xs font-extrabold tracking-widest text-slate-400">
            CONFIRMED
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {stats.confirmed}
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-xs font-extrabold tracking-widest text-slate-400">
            PENDING
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {stats.pending}
          </p>
        </div>

        <div className={cardClass}>
          <p className="text-xs font-extrabold tracking-widest text-slate-400">
            COMPLETED
          </p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {stats.completed}
          </p>
        </div>
      </div>

      {/* Recent bookings */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-extrabold text-slate-900">
            Recent Bookings
          </h3>

          <button
            onClick={() => router.push("/bookings")}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800"
          >
            View all <ArrowRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="animate-spin" size={18} />
            Loading bookings...
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 p-6 ring-1 ring-black/5">
            <p className="font-bold text-slate-700">No bookings yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Start by searching freelancers near your location.
            </p>

            <button
              onClick={() => router.push("/search")}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-extrabold text-white hover:bg-blue-700 shadow"
            >
              <BadgeCheck size={18} />
              Find verified freelancers
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 5).map((b) => (
              <div
                key={b._id}
                className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 flex items-center justify-between"
              >
                <div>
                  <p className="font-extrabold text-slate-900">
                    {b.serviceType}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(b.preferredDate).toLocaleDateString()} ·{" "}
                    {b.preferredTime}
                  </p>
                </div>

                <span className="rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-widest ring-1 ring-black/5 text-slate-700">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h4 className="text-lg font-extrabold text-slate-900 mb-3">
          Tips to get faster bookings
        </h4>
        <ul className="text-sm text-slate-600 space-y-2">
          <li>• Choose the correct service type for accurate pricing</li>
          <li>• Prefer morning slots for quicker confirmations</li>
          <li>• Use precise address + landmark for faster arrival</li>
          <li className="inline-flex items-center gap-2 font-bold text-amber-700">
            <Star size={16} fill="currentColor" /> Leave review after completion
          </li>
        </ul>
      </div>
      <div>
        <GetLocationButton />
      </div>
    </div>
  );
}
