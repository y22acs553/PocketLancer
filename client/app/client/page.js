// /client/app/client/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

const ClientDashboardPage = () => {
  const router = useRouter();
  const [stats, setStats] = useState({ open: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Fetch dashboard stats from server
        const res = await api.get("/client/dashboard"); // Correct API route // Make sure this route exists
        setStats(res.data);
      } catch (err) {
        console.error("❌ [DASHBOARD FETCH ERROR]", err);

        // Handle session expiration
        if (err.response?.status === 401) {
          alert("Session expired. Please login again.");
          router.push("/login");
        } else if (err.response?.status === 404) {
          setError("Dashboard route not found. Contact admin.");
        } else {
          setError("Failed to load dashboard. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [router]);

  if (loading)
    return (
      <p className="text-gray-500 text-center mt-8">Loading dashboard...</p>
    );

  if (error)
    return (
      <p className="text-red-500 text-center mt-8">{error}</p>
    );

  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Welcome to Your Client Hub!</h1>
      <p className="text-gray-600 mb-6">
        Quickly track your bookings, completed services, and pending payments.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold text-blue-600">Open Bookings</h3>
          <p className="text-3xl mt-2">{stats.open}</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold text-green-600">Services Completed</h3>
          <p className="text-3xl mt-2">{stats.completed}</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-xl font-bold text-yellow-600">Pending Payments</h3>
          <p className="text-3xl mt-2">{stats.pending}</p>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboardPage;