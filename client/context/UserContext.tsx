"use client";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import api from "@/services/api";
import socket from "@/services/socket";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "client" | "freelancer" | "admin";
  phone?: string;
  honorScore?: number;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter(); // ✅ FIX HERE

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await api.get("/auth/check-session");

      const loggedUser = res.data.user;
      setUser(loggedUser);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setUser(null);
      } else {
        console.error("Session check failed", err);
      }
    }
  };

  useEffect(() => {
    fetchSession().finally(() => setLoading(false));
  }, []);

  // ✅ Use user._id (string) NOT user (object) as dep.
  // The user object gets a new reference on every context re-render.
  // Using the object causes this effect to fire in a loop, emitting
  // repeated "join" events and potentially freezing the dev server.
  useEffect(() => {
    if (user?._id) {
      socket.emit("join", user._id);
    }
  }, [user?._id]);

  const refreshUser = async () => {
    await fetchSession();
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return ctx;
}
