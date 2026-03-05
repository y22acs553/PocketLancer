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
  LogIn,
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
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const NOTIF_STYLES: Record<string, { icon: React.ReactNode; accent: string; bg: string }> = {
  booking_created:   { icon: <CalendarCheck2 size={15} />, accent: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30" },
  booking_confirmed: { icon: <CalendarCheck2 size={15} />, accent: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  booking_completed: { icon: <CalendarCheck2 size={15} />, accent: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  booking_cancelled: { icon: <CalendarCheck2 size={15} />, accent: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/20" },
  dispute_created:   { icon: <ShieldAlert size={15} />,   accent: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  dispute_resolved:  { icon: <ShieldAlert size={15} />,   accent: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  password_reset:    { icon: <KeyRound size={15} />,      accent: "text-slate-600",   bg: "bg-slate-50 dark:bg-slate-800/40" },
  admin_message:     { icon: <Megaphone size={15} />,     accent: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  payment_released:  { icon: <CreditCard size={15} />,    accent: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  review_received:   { icon: <Bell size={15} />,           accent: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
};
const DEFAULT_STYLE = { icon: <Bell size={15} />, accent: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800/40" };
function getStyle(type: string) { return NOTIF_STYLES[type] ?? DEFAULT_STYLE; }

// ── Shared notification list (desktop + mobile) ───────────────────

function NotifList({
  notifications,
  unread,
  markingAll,
  onMarkAllRead,
  onMarkAsRead,
  onClose,
}: {
  notifications: any[];
  unread: number;
  markingAll: boolean;
  onMarkAllRead: () => void;
  onMarkAsRead: (n: any) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b dark:border-slate-800">
        <div>
          <p className="font-black text-slate-900 dark:text-white">Notifications</p>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X size={15} />
          </button>
        </div>
      </div>
      <div className="max-h-[min(380px,55vh)] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Bell size={18} className="text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const style = getStyle(n.type);
            return (
              <button
                key={n._id}
                type="button"
                onClick={() => onMarkAsRead(n)}
                className={[
                  "w-full flex items-start gap-3 px-5 py-4 border-b last:border-0 text-left transition",
                  "hover:bg-slate-50 dark:hover:bg-slate-900/60 dark:border-slate-800/60",
                  !n.read ? "bg-blue-50/60 dark:bg-blue-950/20" : "",
                ].join(" ")}
              >
                <div className={["mt-0.5 flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center", style.bg, style.accent].join(" ")}>
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={["text-sm leading-snug break-words", !n.read ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300"].join(" ")}>
                    {n.message}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <div className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />}
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

// ── Main DashboardHeader ──────────────────────────────────────────

export default function DashboardHeader() {
  const { user, logout } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [search, setSearch] = useState("");

  // ── SEPARATE state and refs for desktop vs mobile ─────────────
  // Root cause of original bug: single ref assigned to 2 DOM elements.
  // React only keeps the last assignment → desktop ref was null → click-outside
  // closed desktop menu immediately before the onClick handler fired.
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [desktopNotifOpen, setDesktopNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);

  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);

  // ── Close dropdowns on outside click ─────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(t)) setDesktopMenuOpen(false);
      if (desktopNotifRef.current && !desktopNotifRef.current.contains(t)) setDesktopNotifOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(t)) setMobileMenuOpen(false);
      if (mobileNotifRef.current && !mobileNotifRef.current.contains(t)) setMobileNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Close all on route change ─────────────────────────────────
  useEffect(() => {
    setDesktopMenuOpen(false);
    setDesktopNotifOpen(false);
    setMobileMenuOpen(false);
    setMobileNotifOpen(false);
  }, [pathname]);

  const userId = user?._id ?? null;
  const userRole = user?.role ?? null;

  // ── Fetch notifications ───────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    api.get("/notifications")
      .then((res) => {
        setNotifications(res.data);
        setUnread(res.data.filter((n: any) => !n.read).length);
      })
      .catch(() => {});
  }, [userId]);

  // ── Socket real-time ──────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    socket.emit("join", userId);
    const handler = (data: any) => {
      setNotifications((prev) => [data, ...prev]);
      setUnread((n) => n + 1);
    };
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [userId]);

  // ── Notification actions ──────────────────────────────────────
  const markAsRead = async (notification: any) => {
    try {
      if (!notification.read) {
        await api.patch(`/notifications/${notification._id}/read`);
        setNotifications((prev) => prev.map((n) => n._id === notification._id ? { ...n, read: true } : n));
        setUnread((n) => Math.max(0, n - 1));
      }
      setDesktopNotifOpen(false);
      setMobileNotifOpen(false);
      if (notification.link) router.push(notification.link);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {} finally { setMarkingAll(false); }
  };

  // ── Navigation actions — use window.location.href for reliability ──
  // router.push can silently fail if the router context is stale.
  // window.location.href is always reliable.
  const closeAllMenus = () => {
    setDesktopMenuOpen(false);
    setDesktopNotifOpen(false);
    setMobileMenuOpen(false);
    setMobileNotifOpen(false);
  };

  const handleLogout = async () => {
    closeAllMenus();
    try { await logout(); } catch {}
    window.location.href = "/login";
  };

  const handleSwitchRole = async () => {
    closeAllMenus();
    try {
      const newRole = userRole === "client" ? "freelancer" : "client";
      await api.post("/auth/switch-role", { role: newRole });
      window.location.href = "/dashboard";
    } catch {
      alert("Failed to switch role. Try again.");
    }
  };

  const nav = (href: string) => { closeAllMenus(); window.location.href = href; };

  const handleSearch = () => {
    const q = search.trim();
    if (!q) return;
    router.push(userRole === "client" ? `/search?skills=${encodeURIComponent(q)}` : `/bookings?q=${encodeURIComponent(q)}`);
  };

  // ── Nav links per role ────────────────────────────────────────
  const links = useMemo(() => {
    if (!userRole) return [];
    if (userRole === "admin") return [
      { label: "Admin Panel", href: "/admin", icon: <LayoutDashboard size={18} /> },
    ];
    if (userRole === "freelancer") return [
      { label: "Dashboard", href: "/dashboard/freelancer", icon: <LayoutDashboard size={18} /> },
      { label: "Profile",   href: "/freelancer/profile",  icon: <UserIcon size={18} /> },
      { label: "Calendar",  href: "/calendar",            icon: <CalendarDays size={18} /> },
      { label: "Bookings",  href: "/freelancer/bookings", icon: <Briefcase size={18} /> },
    ];
    return [
      { label: "Dashboard", href: "/dashboard/client", icon: <LayoutDashboard size={18} /> },
      { label: "Search",    href: "/search",           icon: <SearchIcon size={18} /> },
      { label: "Bookings",  href: "/bookings",         icon: <CalendarDays size={18} /> },
    ];
  }, [userRole]);

  // ── Shared dropdown menu items ────────────────────────────────
  const DropdownItems = () => (
    <div className="py-1">
      <button type="button" onClick={() => nav(userRole === "admin" ? "/admin" : "/dashboard")}
        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition">
        <LayoutDashboard size={16} className="text-slate-400 shrink-0" /> Dashboard
      </button>
      <button type="button" onClick={() => nav(userRole === "freelancer" ? "/freelancer/profile" : userRole === "client" ? "/client/profile" : "/dashboard")}
        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition">
        <UserIcon size={16} className="text-slate-400 shrink-0" /> My Profile
      </button>
      {userRole === "freelancer" && (
        <button type="button" onClick={() => nav("/calendar")}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition">
          <CalendarDays size={16} className="text-slate-400 shrink-0" /> Calendar
        </button>
      )}
      {userRole !== "admin" && (
        <button type="button" onClick={handleSwitchRole}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition">
          <Repeat size={16} className="text-slate-400 shrink-0" /> Switch Role
        </button>
      )}
      <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
      <button type="button" onClick={handleLogout}
        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition">
        <LogOut size={16} className="shrink-0" /> Logout
      </button>
    </div>
  );

  // ── Not logged in: minimal header ─────────────────────────────
  if (!user) {
    return (
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm dark:bg-white dark:text-slate-900">P</div>
            <p className="font-black text-slate-900 dark:text-white hidden sm:block">PocketLancer</p>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900 transition">
              <LogIn size={15} /> Login
            </Link>
            <Link href="/register" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition">
              Join Now
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* ══ Top Header ══════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="h-9 w-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm dark:bg-white dark:text-slate-900">P</div>
            <div className="hidden sm:block leading-tight">
              <p className="font-black text-slate-900 dark:text-white text-sm">PocketLancer</p>
              <p className="text-[10px] font-bold text-slate-500 capitalize dark:text-slate-400">{user.role} dashboard</p>
            </div>
          </Link>

          {/* Desktop nav — lg+ */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link key={l.href} href={l.href}
                  className={["flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition", active
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                  ].join(" ")}
                >
                  {l.icon} {l.label}
                </Link>
              );
            })}
          </nav>

          {/* Search — xl+ */}
          <div className="hidden xl:flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 dark:bg-slate-900 dark:border-slate-800 focus-within:ring-2 focus-within:ring-slate-300 dark:focus-within:ring-slate-700">
            <SearchIcon size={15} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={userRole === "client" ? "Search skills…" : "Search bookings…"}
              className="w-48 bg-transparent outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400 dark:text-white"
            />
            <button onClick={handleSearch}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 transition shrink-0">
              Search
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">

            {/* Notifications — desktop sm+ */}
            <div className="relative hidden sm:block" ref={desktopNotifRef}>
              <button type="button"
                onClick={() => { setDesktopNotifOpen((s) => !s); setDesktopMenuOpen(false); }}
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {desktopNotifOpen && (
                <div className="absolute right-0 mt-2 w-[min(calc(100vw-2rem),22rem)] rounded-2xl border bg-white shadow-2xl z-50 dark:bg-slate-950 dark:border-slate-800 overflow-hidden">
                  <NotifList notifications={notifications} unread={unread} markingAll={markingAll}
                    onMarkAllRead={markAllRead} onMarkAsRead={markAsRead} onClose={() => setDesktopNotifOpen(false)} />
                </div>
              )}
            </div>

            {/* User dropdown — desktop */}
            <div className="relative" ref={desktopMenuRef}>
              <button type="button"
                onClick={() => { setDesktopMenuOpen((s) => !s); setDesktopNotifOpen(false); }}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900 transition"
              >
                <span className="h-7 w-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs dark:bg-white dark:text-slate-900">
                  {(user.name || "U")[0].toUpperCase()}
                </span>
                <div className="hidden md:block text-left leading-tight">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-slate-900 dark:text-white max-w-[90px] truncate">{user.name}</p>
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{user.role}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{user.email}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${desktopMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {desktopMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border bg-white shadow-xl z-50 dark:bg-slate-950 dark:border-slate-800">
                  <DropdownItems />
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ══ Mobile Bottom Navigation ════════════════════════════════ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-200 dark:border-white/10 bg-white/98 dark:bg-slate-950/98 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch justify-around px-1 pt-1 pb-1 max-w-lg mx-auto">

          {/* Nav links */}
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[52px] px-1 py-1.5 rounded-xl"
              >
                <span className={["flex items-center justify-center rounded-xl transition-all duration-200",
                  active ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 h-7" : "text-slate-400 dark:text-slate-500 w-7 h-7",
                ].join(" ")}>
                  <span className={active ? "scale-90" : ""}>{l.icon}</span>
                </span>
                <span className={`text-[10px] font-black truncate max-w-[56px] text-center leading-none mt-0.5 ${active ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                  {l.label}
                </span>
              </Link>
            );
          })}

          {/* Notifications — mobile */}
          <div className="relative flex-1" ref={mobileNotifRef}>
            <button type="button"
              onClick={() => { setMobileNotifOpen((s) => !s); setMobileMenuOpen(false); }}
              className="flex flex-col items-center justify-center gap-0.5 w-full min-h-[52px] px-1 py-1.5 rounded-xl"
            >
              <span className={["relative flex items-center justify-center rounded-xl transition-all duration-200",
                mobileNotifOpen ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 h-7" : "text-slate-400 dark:text-slate-500 w-7 h-7",
              ].join(" ")}>
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black rounded-full min-w-[13px] h-[13px] flex items-center justify-center px-0.5 border border-white dark:border-slate-950">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-black leading-none mt-0.5 ${mobileNotifOpen ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                Alerts
              </span>
            </button>
            {mobileNotifOpen && (
              <div className="absolute bottom-full mb-2 right-0 w-[min(calc(100vw-1rem),22rem)] rounded-2xl border bg-white shadow-2xl z-50 dark:bg-slate-950 dark:border-slate-800 overflow-hidden">
                <NotifList notifications={notifications} unread={unread} markingAll={markingAll}
                  onMarkAllRead={markAllRead} onMarkAsRead={markAsRead} onClose={() => setMobileNotifOpen(false)} />
              </div>
            )}
          </div>

          {/* Profile / menu — mobile */}
          <div className="relative flex-1" ref={mobileMenuRef}>
            <button type="button"
              onClick={() => { setMobileMenuOpen((s) => !s); setMobileNotifOpen(false); }}
              className="flex flex-col items-center justify-center gap-0.5 w-full min-h-[52px] px-1 py-1.5 rounded-xl"
            >
              <span className={["flex items-center justify-center font-black text-xs transition-all duration-200 rounded-xl",
                mobileMenuOpen
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 h-7"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 w-7 h-7 rounded-full",
              ].join(" ")}>
                {(user.name || "U")[0].toUpperCase()}
              </span>
              <span className={`text-[10px] font-black leading-none mt-0.5 truncate max-w-[52px] text-center ${mobileMenuOpen ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}>
                {user.name?.split(" ")[0] || "Me"}
              </span>
            </button>
            {mobileMenuOpen && (
              <div className="absolute bottom-full mb-2 right-0 w-56 overflow-hidden rounded-2xl border bg-white shadow-xl z-50 dark:bg-slate-950 dark:border-slate-800">
                <DropdownItems />
              </div>
            )}
          </div>

        </div>
      </nav>
    </>
  );
}
