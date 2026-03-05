"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import socket from "@/services/socket";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";

export default function NotificationBell() {
  const { user } = useUser();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load existing notifications
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/notifications");
        setNotifications(res.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    if (user) load();
  }, [user]);

  // Real-time notifications
  useEffect(() => {
    const handler = (data: any) => {
      setNotifications((prev) => [data, ...prev]);
    };

    socket.on("notification", handler);

    return () => {
      socket.off("notification", handler);
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      {/* Bell */}
      <button onClick={() => setOpen(!open)} className="relative">
        <Bell size={22} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 bg-white shadow-xl rounded-xl border z-50">
          <div className="p-3 font-bold border-b">Notifications</div>

          {notifications.length === 0 && (
            <div className="p-4 text-sm text-gray-500">No notifications</div>
          )}

          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => markAsRead(n._id)}
              className={`p-3 text-sm cursor-pointer border-b hover:bg-gray-50 ${
                !n.read ? "bg-blue-50" : ""
              }`}
            >
              {n.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
