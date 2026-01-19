"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function DashboardPage() {
  const { user, loading, logout } = useUser();
  const router = useRouter();

  // 🔐 Auth protection ONLY
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading dashboard…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Welcome back, {user.name}</p>
        </div>

        <button
          onClick={logout}
          className="rounded-lg bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Account Overview */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-800">
          Account Overview
        </h2>

        <div className="space-y-2 text-slate-700">
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Role:</strong>{" "}
            <span className="capitalize">{user.role}</span>
          </p>
        </div>
      </div>

      {/* Role-based Sections */}
      {user.role === "freelancer" && <FreelancerDashboard router={router} />}
      {user.role === "client" && <ClientDashboard router={router} />}
    </div>
  );
}

/* =====================================================
   FREELANCER DASHBOARD
   ===================================================== */

function FreelancerDashboard({ router }: { router: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-800">
        Freelancer Panel
      </h2>

      <ul className="space-y-3 text-slate-700">
        <li>• View and manage your bookings</li>
        <li>• Update your freelancer profile</li>
        <li>• Respond to client requests</li>
        <li>• Track reviews and ratings</li>
      </ul>

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => router.push("/bookings")}
          className="rounded-lg bg-brand-primary px-4 py-2 font-semibold text-white hover:bg-blue-600"
        >
          View Bookings
        </button>

        <button
          onClick={() => router.push("/freelancer/profile/edit")}
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   CLIENT DASHBOARD
   ===================================================== */

function ClientDashboard({ router }: { router: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-800">
        Client Panel
      </h2>

      <ul className="space-y-3 text-slate-700">
        <li>• Search for freelancers</li>
        <li>• Manage your bookings</li>
        <li>• Leave reviews</li>
        <li>• Track project status</li>
      </ul>

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => router.push("/search")}
          className="rounded-lg bg-brand-primary px-4 py-2 font-semibold text-white hover:bg-blue-600"
        >
          Find Freelancers
        </button>

        <button
          onClick={() => router.push("/bookings")}
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          View Bookings
        </button>
      </div>
    </div>
  );
}
