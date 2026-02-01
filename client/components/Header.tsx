"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import api from "@/services/api";
import {
  LogOut,
  User as UserIcon,
  ChevronDown,
  Repeat,
  LayoutDashboard,
} from "lucide-react";

export default function Header() {
  const { user, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDashboardRoute = pathname.startsWith("/dashboard");

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
    setOpen(false);
    await logout();
    router.replace("/login");
  };

  /**
   * ✅ Switch Role
   * - calls backend to change user.role
   * - then reload to refresh session + user context
   */
  const handleSwitchRole = async () => {
    try {
      if (!user) return;

      setOpen(false);

      const newRole = user.role === "client" ? "freelancer" : "client";

      await api.post("/auth/switch-role", { role: newRole });

      // ✅ hard reload to refresh UserContext cleanly
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Switch role failed", err);
      alert("Failed to switch role. Try again.");
    }
  };

  const goToDashboard = () => {
    if (!user) return;
    router.push("/dashboard");
  };

  const goToProfile = () => {
    setOpen(false);

    if (user?.role === "freelancer") {
      router.push("/freelancer/profile");
    } else {
      router.push("/dashboard/client");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-white/10">
      <div className="w-full px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between">
        {/* Left */}
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">
            P
          </div>
          <div className="leading-tight">
            <p className="font-black text-slate-900">PocketLancer</p>
            <p className="text-xs font-bold text-slate-500">
              Hire trusted freelancers
            </p>
          </div>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Logged OUT */}
          {!user && (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition"
              >
                Join Now
              </Link>
            </div>
          )}

          {/* Logged IN */}
          {user && (
            <>
              {/* Dashboard CTA only on non-dashboard pages */}
              {!isDashboardRoute && (
                <button
                  onClick={goToDashboard}
                  className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-black text-white shadow hover:shadow-md transition"
                >
                  Go to Dashboard
                </button>
              )}

              {/* Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpen((s) => !s)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm hover:bg-slate-50"
                >
                  <span className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </span>

                  <div className="text-left leading-tight">
                    <p className="text-sm font-black text-slate-900">
                      {user.name}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      {user.email}
                    </p>
                  </div>

                  <ChevronDown size={16} className="text-slate-500" />
                </button>

                {open && (
                  <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border bg-white shadow-xl z-50">
                    <button
                      onClick={() => {
                        setOpen(false);
                        router.push("/dashboard");
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50"
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </button>

                    <button
                      onClick={goToProfile}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50"
                    >
                      <UserIcon size={16} />
                      My Profile
                    </button>

                    {/* ✅ SWITCH ROLE */}
                    <button
                      onClick={handleSwitchRole}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50"
                    >
                      <Repeat size={16} />
                      Switch Role
                    </button>

                    <div className="h-px bg-slate-100" />

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
