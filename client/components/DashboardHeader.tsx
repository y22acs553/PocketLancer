"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import socket from "@/services/socket";
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
  Bell,
  CalendarCheck2,
  ShieldAlert,
  KeyRound,
  CreditCard,
  Megaphone,
  CheckCheck,
  X,
} from "lucide-react";

// ── Notification helpers ──────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const NOTIF_STYLES: Record<
  string,
  { icon: React.ReactNode; accent: string; bg: string }
> = {
  booking_created: {
    icon: <CalendarCheck2 size={15} />,
    accent: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  booking_confirmed: {
    icon: <CalendarCheck2 size={15} />,
    accent: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  booking_completed: {
    icon: <CalendarCheck2 size={15} />,
    accent: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  booking_cancelled: {
    icon: <CalendarCheck2 size={15} />,
    accent: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
  },
  dispute_created: {
    icon: <ShieldAlert size={15} />,
    accent: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  dispute_resolved: {
    icon: <ShieldAlert size={15} />,
    accent: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  password_reset: {
    icon: <KeyRound size={15} />,
    accent: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-800/40",
  },
  admin_message: {
    icon: <Megaphone size={15} />,
    accent: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  payment_released: {
    icon: <CreditCard size={15} />,
    accent: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  review_received: {
    icon: <Bell size={15} />,
    accent: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
};

const DEFAULT_STYLE = {
  icon: <Bell size={15} />,
  accent: "text-slate-500",
  bg: "bg-slate-50 dark:bg-slate-800/40",
};

function getStyle(type: string) {
  return NOTIF_STYLES[type] ?? DEFAULT_STYLE;
}

// ── NavLink ───────────────────────────────────────────────────────

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
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-extrabold transition",
        active
          ? "bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900"
          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900",
      ].join(" ")}
    >
      {icon}
      {label}
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function DashboardHeader() {
  const { user, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Close dropdowns on outside click ─────────────────────────
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

  // ── Close on route change ─────────────────────────────────────
  useEffect(() => {
    setMenuOpen(false);
    setShowNotifications(false);
  }, [pathname]);

  // ✅ user?._id (string) not user (object) — object ref changes every render
  const userId = user?._id ?? null;

  // ── Fetch notifications on mount ─────────────────────────────
  useEffect(() => {
    if (!userId) return;
    api
      .get("/notifications")
      .then((res) => {
        setNotifications(res.data);
        setUnread(res.data.filter((n: any) => !n.read).length);
      })
      .catch(() => {});
  }, [userId]);

  // ── Socket: real-time new notifications ──────────────────────
  useEffect(() => {
    if (!userId) return;

    socket.emit("join", userId);

    const handler = (data: any) => {
      setNotifications((prev) => [data, ...prev]);
      setUnread((n) => n + 1);
    };

    socket.on("notification", handler);
    return () => {
      socket.off("notification", handler);
    };
  }, [userId]);

  // ── Actions ───────────────────────────────────────────────────

  const markAsRead = async (notification: any) => {
    try {
      if (!notification.read) {
        await api.patch(`/notifications/${notification._id}/read`);
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notification._id ? { ...n, read: true } : n,
          ),
        );
        setUnread((n) => Math.max(0, n - 1));
      }
      if (notification.link) router.push(notification.link);
      setShowNotifications(false);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
    } finally {
      setMarkingAll(false);
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.replace("/login");
  };

  const handleSwitchRole = async () => {
    try {
      setMenuOpen(false);
      const newRole = user?.role === "client" ? "freelancer" : "client";
      await api.post("/auth/switch-role", { role: newRole });
      window.location.href = "/dashboard";
    } catch {
      alert("Failed to switch role. Try again.");
    }
  };

  const goToProfile = () => {
    setMenuOpen(false);
    if (user?.role === "freelancer") router.push("/freelancer/profile");
    else if (user?.role === "client") router.push("/client/profile");
    else router.push("/dashboard");
  };

  const handleSearch = () => {
    const q = search.trim();
    if (!q) return;
    if (user?.role === "client")
      router.push(`/search?skills=${encodeURIComponent(q)}`);
    else router.push(`/bookings?q=${encodeURIComponent(q)}`);
  };

  // ── Nav links per role ────────────────────────────────────────
  // ✅ FIX: "Messages" link removed from both freelancer and client nav

  const userRole = user?.role ?? null;

  const links = useMemo(() => {
    if (!userRole) return [];
    if (userRole === "admin") {
      return [
        {
          label: "Admin Panel",
          href: "/admin",
          icon: <LayoutDashboard size={18} />,
        },
      ];
    }
    if (userRole === "freelancer") {
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
          label: "Calendar",
          href: "/calendar",
          icon: <CalendarDays size={18} />,
        },
        {
          label: "Bookings",
          href: "/freelancer/bookings",
          icon: <Briefcase size={18} />,
        },
        // ✅ Messages link removed intentionally
      ];
    }
    return [
      {
        label: "Dashboard",
        href: "/dashboard/client",
        icon: <LayoutDashboard size={18} />,
      },
      { label: "Search", href: "/search", icon: <SearchIcon size={18} /> },
      {
        label: "Bookings",
        href: "/bookings",
        icon: <CalendarDays size={18} />,
      },
      // ✅ Messages link removed intentionally
    ];
  }, [userRole]);

  if (!user) return null;

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
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
          {/* ── Notifications ── */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications((s) => !s)}
              className="relative rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 transition"
              title="Notifications"
            >
              <Bell size={18} className="text-slate-700 dark:text-white" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-96 rounded-2xl border bg-white shadow-2xl z-50 dark:bg-slate-950 dark:border-slate-800 overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-800">
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">
                      Notifications
                    </p>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">
                      {unread > 0 ? `${unread} unread` : "All caught up"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        disabled={markingAll}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        title="Mark all as read"
                      >
                        <CheckCheck size={13} />
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Bell size={20} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        No notifications yet
                      </p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const style = getStyle(n.type);
                      return (
                        <button
                          key={n._id}
                          onClick={() => markAsRead(n)}
                          className={[
                            "w-full flex items-start gap-3 px-5 py-4 border-b last:border-0 text-left transition",
                            "hover:bg-slate-50 dark:hover:bg-slate-900/60 dark:border-slate-800/60",
                            !n.read ? "bg-blue-50/60 dark:bg-blue-950/20" : "",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "mt-0.5 flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center",
                              style.bg,
                              style.accent,
                            ].join(" ")}
                          >
                            {style.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={[
                                "text-sm leading-snug break-words",
                                !n.read
                                  ? "font-bold text-slate-900 dark:text-white"
                                  : "font-medium text-slate-600 dark:text-slate-300",
                              ].join(" ")}
                            >
                              {n.message}
                            </p>
                            <p className="text-[11px] font-bold text-slate-400 mt-1">
                              {timeAgo(n.createdAt)}
                            </p>
                          </div>

                          {!n.read && (
                            <div className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── User dropdown ── */}
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
                    router.push(
                      user.role === "admin" ? "/admin" : "/dashboard",
                    );
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                >
                  <LayoutDashboard size={16} /> Dashboard
                </button>
                <button
                  onClick={goToProfile}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                >
                  <UserIcon size={16} /> My Profile
                </button>
                {user.role === "freelancer" && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/calendar");
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                  >
                    <CalendarDays size={16} /> Calendar
                  </button>
                )}
                {user.role !== "admin" && (
                  <button
                    onClick={handleSwitchRole}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-white"
                  >
                    <Repeat size={16} /> Switch Role
                  </button>
                )}
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
