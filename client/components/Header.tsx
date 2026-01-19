"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import api from "@/services/api";
import { LogOut, User as UserIcon, ChevronDown, Repeat } from "lucide-react";

export default function Header() {
  const { user, logout, refreshUser } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isOnDashboard = pathname === "/dashboard";

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  /**
   * ✅ CORRECT SWITCH ROLE LOGIC
   * - Switch role on backend
   * - Always return to /dashboard
   */
  const handleSwitchRole = async () => {
    try {
      const newRole = user?.role === "client" ? "freelancer" : "client";

      await api.post("/auth/switch-role", { role: newRole });

      // hard reload to rehydrate UserContext
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Switch role failed", err);
    }
  };

  const goToProfile = () => {
    setOpen(false);

    if (user?.role === "freelancer") {
      router.push("/freelancer/profile/");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center">
      {/* Logo */}
      <Link href="/" className="text-xl font-bold text-slate-900">
        PocketLancer
      </Link>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Logged OUT */}
        {!user && (
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              Join Now
            </Link>
          </div>
        )}

        {/* Logged IN */}
        {user && (
          <div className="flex items-center gap-4">
            {/* DASHBOARD CTA (hidden on dashboard page) */}
            {!isOnDashboard && (
              <button
                onClick={() => router.push("/dashboard")}
                className="relative overflow-hidden rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 transition-opacity hover:opacity-100" />
                <span className="relative">
                  Go to{" "}
                  {user.role === "client"
                    ? "Client Dashboard"
                    : "Freelancer Dashboard"}
                </span>
              </button>
            )}

            {/* ACCOUNT DROPDOWN */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <UserIcon size={16} />
                {user.name}
                <ChevronDown size={16} />
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg overflow-hidden z-50">
                  <button
                    onClick={goToProfile}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50"
                  >
                    <UserIcon size={16} />
                    My Profile
                  </button>

                  <button
                    onClick={handleSwitchRole}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50"
                  >
                    <Repeat size={16} />
                    Switch Role
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
