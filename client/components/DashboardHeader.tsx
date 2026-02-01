"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/context/UserContext";
import api from "@/services/api";

import {
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  Search as SearchIcon,
  LogOut,
  ChevronDown,
  Repeat,
  User as UserIcon,
  Menu,
  X,
  Bell,
} from "lucide-react";

function NavLink({
  href,
  label,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold transition",
        active
          ? "bg-slate-900 text-white shadow"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900",
      ].join(" ")}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function DashboardHeader() {
  const { user, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ Search state
  const [search, setSearch] = useState("");

  // ✅ Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setMenuOpen(false);

      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifications(false);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
    setShowNotifications(false);
  }, [pathname]);

  const links = useMemo(() => {
    if (!user) return [];

    if (user.role === "freelancer") {
      return [
        {
          label: "Dashboard",
          href: "/dashboard/freelancer",
          icon: <LayoutDashboard size={18} />,
        },
        {
          label: "My Profile",
          href: "/freelancer/profile",
          icon: <Briefcase size={18} />,
        },
        {
          label: "Bookings",
          href: "/bookings",
          icon: <CalendarDays size={18} />,
        },
      ];
    }

    return [
      {
        label: "Dashboard",
        href: "/dashboard/client",
        icon: <LayoutDashboard size={18} />,
      },
      {
        label: "Search",
        href: "/search",
        icon: <SearchIcon size={18} />,
      },
      {
        label: "Bookings",
        href: "/bookings",
        icon: <CalendarDays size={18} />,
      },
    ];
  }, [user]);

  if (!user) return null;

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.replace("/login");
  };

  const handleSwitchRole = async () => {
    try {
      setMenuOpen(false);
      setMobileOpen(false);

      const newRole = user.role === "client" ? "freelancer" : "client";
      await api.post("/auth/switch-role", { role: newRole });

      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Switch role failed:", err);
      alert("Failed to switch role. Try again.");
    }
  };

  const goToProfile = () => {
    setMenuOpen(false);
    setMobileOpen(false);

    if (user.role === "freelancer") router.push("/freelancer/profile");
    else router.push("/dashboard/client");
  };

  const handleSearch = () => {
    const q = search.trim();
    if (!q) return;

    if (user.role === "client")
      router.push(`/search?skills=${encodeURIComponent(q)}`);

    if (user.role === "freelancer")
      router.push(`/bookings?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-white/10">
      <div className="w-full px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black dark:bg-white dark:text-slate-900">
            P
          </div>
          <div className="leading-tight">
            <p className="font-black text-slate-900 dark:text-white">
              PocketLancer
            </p>
            <p className="text-xs font-bold text-slate-500 capitalize dark:text-slate-400">
              {user.role} dashboard
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-2">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} icon={l.icon} />
          ))}
        </nav>

        {/* Search bar */}
        <div className="hidden xl:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <SearchIcon
            size={18}
            className="text-slate-500 dark:text-slate-300"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder={
              user.role === "client"
                ? "Search skills (ex: electrician)..."
                : "Search bookings..."
            }
            className="w-72 bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 dark:text-white"
          />
          <button
            onClick={handleSearch}
            className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            Search
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Mobile menu */}
          <button
            className="lg:hidden rounded-xl border px-3 py-2 font-extrabold hover:bg-slate-50 inline-flex items-center gap-2 dark:border-slate-800 dark:hover:bg-slate-900"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} className="dark:text-white" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((s) => !s)}
              className="rounded-xl border px-3 py-2 hover:bg-slate-50 relative dark:border-slate-800 dark:hover:bg-slate-900"
              title="Notifications"
            >
              <Bell size={18} className="dark:text-white" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border bg-white shadow-xl overflow-hidden z-50 dark:bg-slate-950 dark:border-slate-800">
                <div className="px-4 py-3 border-b dark:border-slate-800">
                  <p className="font-black text-slate-900 dark:text-white">
                    Notifications
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Latest updates & reminders
                  </p>
                </div>

                <div className="p-3 space-y-2">
                  <div className="rounded-xl border px-4 py-3 dark:border-slate-800">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Welcome 🎉
                    </p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                      Complete your profile to get more bookings.
                    </p>
                  </div>

                  <div className="rounded-xl border px-4 py-3 dark:border-slate-800">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Tip
                    </p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                      Reviews increase trust — ask your client after completion.
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t dark:border-slate-800">
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="w-full rounded-xl bg-slate-900 py-2 text-xs font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <span className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs dark:bg-white dark:text-slate-900">
                {(user.name || "U").slice(0, 1).toUpperCase()}
              </span>

              <div className="hidden sm:block text-left leading-tight">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {user.name}
                  </p>
                  <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {user.role}
                  </span>
                </div>

                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              </div>

              <ChevronDown
                size={16}
                className="text-slate-500 dark:text-slate-300"
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border bg-white shadow-xl z-50 dark:bg-slate-950 dark:border-slate-800">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/dashboard");
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>

                <button
                  onClick={goToProfile}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                >
                  <UserIcon size={16} />
                  My Profile
                </button>

                <button
                  onClick={handleSwitchRole}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                >
                  <Repeat size={16} />
                  Switch Role
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl border-l p-6 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <p className="font-black text-slate-900 dark:text-white">Menu</p>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border p-2 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <X size={18} className="dark:text-white" />
              </button>
            </div>

            {/* Search mobile */}
            <div className="mb-5 flex items-center gap-2 rounded-2xl border px-3 py-2 dark:border-slate-800">
              <SearchIcon
                size={18}
                className="text-slate-500 dark:text-slate-300"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder={
                  user.role === "client"
                    ? "Search skills..."
                    : "Search bookings..."
                }
                className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-800 placeholder:text-slate-400 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              {links.map((l) => (
                <NavLink
                  key={l.href}
                  href={l.href}
                  label={l.label}
                  icon={l.icon}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </div>

            <div className="mt-8 space-y-2">
              <button
                onClick={goToProfile}
                className="w-full rounded-2xl border px-4 py-3 font-extrabold text-slate-800 hover:bg-slate-50 flex items-center gap-3 dark:border-slate-800 dark:text-white dark:hover:bg-slate-900"
              >
                <UserIcon size={18} />
                My Profile
              </button>

              <button
                onClick={handleSwitchRole}
                className="w-full rounded-2xl border px-4 py-3 font-extrabold text-slate-800 hover:bg-slate-50 flex items-center gap-3 dark:border-slate-800 dark:text-white dark:hover:bg-slate-900"
              >
                <Repeat size={18} />
                Switch Role
              </button>

              <button
                onClick={handleLogout}
                className="w-full rounded-2xl bg-red-600 px-4 py-3 font-extrabold text-white hover:bg-red-700 transition flex items-center gap-3 justify-center"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
