"use client";

import StatsCard from "@/components/admin/StatsCard";
import BookingsChart from "@/components/admin/BookingsChart";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [stats, setStats] = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);

  /*
  =====================================================
  🔐 Guard — Only Admin Allowed
  =====================================================
  */
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  /*
  =====================================================
  📊 Fetch Platform Stats
  =====================================================
  */
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/stats");

        // 🛡️ sanitize response
        const safe = {
          users: res.data?.users ?? 0,
          freelancers: res.data?.freelancers ?? 0,
          bookings: res.data?.bookings ?? 0,
          chart: Array.isArray(res.data?.chart) ? res.data.chart : [],
        };

        setStats(safe);
      } catch (err) {
        console.log("Admin stats fallback activated");

        // fallback prevents blank screen
        setStats({
          users: 0,
          freelancers: 0,
          bookings: 0,
          chart: [],
        });
      } finally {
        setFetching(false);
      }
    };

    fetchStats();
  }, [user]);

  /*
  =====================================================
  ⏳ Loading States
  =====================================================
  */
  if (loading || fetching) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 font-bold text-slate-600 dark:text-slate-300">
          <Loader2 className="animate-spin" />
          Loading Admin Dashboard...
        </div>
      </div>
    );
  }

  if (!stats) return null;

  /*
  =====================================================
  🧩 UI
  =====================================================
  */
  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">
          Admin Control Center
        </h1>

        <p className="text-sm font-bold text-slate-500">
          Platform analytics & dispute governance
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Total Users" value={stats.users} />
        <StatsCard title="Freelancers" value={stats.freelancers} />
        <StatsCard title="Bookings" value={stats.bookings} />
      </div>

      {/* CHART */}
      <BookingsChart data={stats.chart} />

      {/* DISPUTES NAV */}
      <div className="pt-4">
        <button
          onClick={() => router.push("/admin/disputes")}
          className="rounded-2xl bg-slate-900 px-8 py-4 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
        >
          Open Disputes Panel
        </button>
      </div>
    </div>
  );
}
