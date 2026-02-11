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
  CalendarDays,
} from "lucide-react";

export default function Header() {
  const { user, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDashboardRoute = pathname.startsWith("/dashboard");

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

  const handleSwitchRole = async () => {
    try {
      if (!user || user.role === "admin") return;
      setOpen(false);
      const newRole = user.role === "client" ? "freelancer" : "client";
      await api.post("/auth/switch-role", { role: newRole });
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Switch role failed", err);
      alert("Failed to switch role. Try again.");
    }
  };

  const goToDashboard = () => {
    if (!user) return;
    if (user.role === "admin") router.push("/admin");
    else router.push("/dashboard");
  };

  const goToProfile = () => {
    setOpen(false);
    if (user?.role === "freelancer") router.push("/freelancer/profile");
    else if (user?.role === "client") router.push("/client/profile");
    else if (user?.role === "admin") router.push("/admin");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-white/10">
      <div className="w-full px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between gap-4">
        {/* Left Section */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black dark:bg-white dark:text-slate-900">
            P
          </div>
          <div className="leading-tight hidden xs:block">
            <p className="font-black text-slate-900 dark:text-white">
              PocketLancer
            </p>
            <p className="text-xs font-bold text-slate-500">
              Hire trusted freelancers
            </p>
          </div>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-3 sm:gap-4">
          {!user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 transition dark:bg-white dark:text-slate-900"
              >
                Join Now
              </Link>
            </div>
          ) : (
            <>
              {/* RESTORED: Go to Dashboard Button */}
              {!isDashboardRoute && (
                <button
                  onClick={goToDashboard}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition-all active:scale-95"
                >
                  Go to Dashboard
                </button>
              )}

              {/* User Profile Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpen((s) => !s)}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 sm:px-3 shadow-sm hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <span className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs dark:bg-white dark:text-slate-900">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </span>

                  {/* Name and Email hidden on smaller mobile to keep header thin */}
                  <div className="text-left leading-tight hidden md:block">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown size={16} className="text-slate-500" />
                </button>

                {open && (
                  <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border bg-white shadow-xl z-50 dark:bg-slate-950 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setOpen(false);
                        goToDashboard();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-4 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </button>
                    {user?.role === "freelancer" && (
                      <button
                        onClick={() => {
                          setOpen(false);
                          router.push("/calendar");
                        }}
                        className="flex w-full items-center gap-3 px-4 py-4 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                      >
                        <CalendarDays size={16} /> Calendar
                      </button>
                    )}
                    <button
                      onClick={goToProfile}
                      className="flex w-full items-center gap-3 px-4 py-4 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                    >
                      <UserIcon size={16} /> My Profile
                    </button>
                    {user.role !== "admin" && (
                      <button
                        onClick={handleSwitchRole}
                        className="flex w-full items-center gap-3 px-4 py-4 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                      >
                        <Repeat size={16} /> Switch Role
                      </button>
                    )}
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-4 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <LogOut size={16} /> Logout
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
