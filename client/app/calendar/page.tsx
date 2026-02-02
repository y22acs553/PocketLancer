"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Briefcase,
  Clock,
  CheckCircle2,
  Timer,
} from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

type Booking = {
  _id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  status: BookingStatus;
  estimatedDurationMinutes?: number;
  address?: string;
  issueDescription?: string;
  clientId?: { name?: string; email?: string };
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDatePretty(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusPill(status: BookingStatus) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300";
    case "confirmed":
      return "bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-500/15 dark:text-indigo-300";
    case "cancelled":
      return "bg-red-500/10 text-red-700 ring-1 ring-red-500/15 dark:text-red-300";
    default:
      return "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/15 dark:text-blue-300";
  }
}

function statusLabel(status: BookingStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export default function FreelancerCalendarPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");

  // calendar state
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    return toISODateKey(new Date());
  });

  // auth guard
  useEffect(() => {
    if (!userLoading && (!user || user.role !== "freelancer")) {
      router.replace("/dashboard");
    }
  }, [userLoading, user, router]);

  // fetch bookings
  useEffect(() => {
    if (!user || user.role !== "freelancer") return;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/bookings/mybookings");
        setBookings(res.data?.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.msg || "Failed to fetch bookings");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // group bookings by date key YYYY-MM-DD
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const d = b.preferredDate ? new Date(b.preferredDate) : null;
      if (!d || Number.isNaN(d.getTime())) continue;
      const key = toISODateKey(d);

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }

    // sort inside each date by time string
    for (const [k, list] of map.entries()) {
      list.sort((a, b) =>
        (a.preferredTime || "").localeCompare(b.preferredTime || ""),
      );
      map.set(k, list);
    }

    return map;
  }, [bookings]);

  // month metadata
  const monthLabel = useMemo(() => {
    return monthCursor.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [monthCursor]);

  const calendarCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startWeekDay = firstDay.getDay(); // 0 Sun ... 6 Sat
    const totalDays = lastDay.getDate();

    const cells: { date: Date; inMonth: boolean; key: string }[] = [];

    // previous month filler
    for (let i = 0; i < startWeekDay; i++) {
      const d = new Date(year, month, 1 - (startWeekDay - i));
      cells.push({ date: d, inMonth: false, key: toISODateKey(d) });
    }

    // current month
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      cells.push({ date: d, inMonth: true, key: toISODateKey(d) });
    }

    // next month filler to complete grid (multiple of 7)
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      cells.push({ date: d, inMonth: false, key: toISODateKey(d) });
    }

    return cells;
  }, [monthCursor]);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selectedDateKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDateKey]);

  const selectedBookings = useMemo(() => {
    return bookingsByDate.get(selectedDateKey) || [];
  }, [bookingsByDate, selectedDateKey]);

  const todayKey = toISODateKey(new Date());

  const goPrevMonth = () => {
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const goToday = () => {
    const now = new Date();
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(toISODateKey(now));
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" />
        <p className="font-black">Loading calendar…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 py-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-44 -left-44 h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />

        {/* header */}
        <div className="relative border-b border-slate-200 px-6 py-7 lg:px-10 lg:py-9 dark:border-white/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <CalendarDays size={16} className="text-blue-500" />
                Freelancer Calendar
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                My Bookings Calendar
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                See bookings per day and plan your month professionally.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={goToday}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                Today
              </button>
              <button
                onClick={() => router.push("/freelancer/bookings")}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
              >
                View All Bookings
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        {/* content */}
        <div className="relative grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12 lg:px-10">
          {/* LEFT calendar */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
              {/* month controls */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={goPrevMonth}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="text-center">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {monthLabel}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Tap a day to view bookings
                  </p>
                </div>

                <button
                  onClick={goNextMonth}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* weekdays */}
              <div className="mt-6 grid grid-cols-7 gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="px-2 py-2 text-center">
                    {d}
                  </div>
                ))}
              </div>

              {/* calendar grid */}
              <div className="mt-2 grid grid-cols-7 gap-2">
                {calendarCells.map((cell) => {
                  const key = cell.key;
                  const isSelected = selectedDateKey === key;
                  const isToday = todayKey === key;
                  const count = bookingsByDate.get(key)?.length || 0;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDateKey(key)}
                      className={[
                        "relative rounded-2xl p-3 text-left transition ring-1",
                        cell.inMonth
                          ? "bg-white ring-black/5 hover:bg-slate-50 dark:bg-slate-950 dark:ring-white/10 dark:hover:bg-white/5"
                          : "bg-slate-50 ring-black/5 opacity-60 hover:opacity-100 dark:bg-slate-900 dark:ring-white/10",
                        isSelected
                          ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-500/10"
                          : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={[
                            "text-sm font-black",
                            cell.inMonth
                              ? "text-slate-900 dark:text-white"
                              : "text-slate-400 dark:text-slate-500",
                          ].join(" ")}
                        >
                          {cell.date.getDate()}
                        </span>

                        {isToday && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-500/15 dark:text-emerald-300">
                            Today
                          </span>
                        )}
                      </div>

                      {/* booking indicator */}
                      {count > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-600" />
                          <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                            {count} booking{count > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT details */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Selected Day
                </p>
                <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                  {formatDatePretty(selectedDate)}
                </p>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {selectedBookings.length} booking
                    {selectedBookings.length !== 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Click a date in calendar to view schedule.
                  </p>
                </div>

                {/* list */}
                <div className="mt-5 space-y-3">
                  {selectedBookings.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
                      No bookings for this day.
                    </div>
                  ) : (
                    selectedBookings.map((b) => (
                      <div
                        key={b._id}
                        className="rounded-2xl bg-white p-4 ring-1 ring-black/5 shadow-sm dark:bg-slate-950 dark:ring-white/10"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                              {b.serviceType}
                            </p>

                            {b.clientId?.name && (
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                Client: {b.clientId.name}
                              </p>
                            )}
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusPill(
                              b.status,
                            )}`}
                          >
                            {statusLabel(b.status)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                            <Clock size={14} className="text-slate-400" />
                            {b.preferredTime || "—"}
                          </span>

                          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                            <Timer size={14} className="text-slate-400" />
                            {typeof b.estimatedDurationMinutes === "number"
                              ? `${b.estimatedDurationMinutes} mins`
                              : "Duration —"}
                          </span>
                        </div>

                        <button
                          onClick={() => router.push("/freelancer/bookings")}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                        >
                          <Briefcase size={16} />
                          Open bookings
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* TIP card */}
              <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm hover:shadow-md transition-all">
                <p className="text-sm font-black">Pro tip</p>
                <p className="mt-2 text-sm text-slate-200 font-semibold">
                  Confirm bookings early to improve client trust and boost your
                  profile ranking.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-black text-slate-200">
                  <CheckCircle2 size={16} />
                  Better profile visibility
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* end grid */}
      </div>
    </div>
  );
}
