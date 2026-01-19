"use client";

import { createContext, useContext, useEffect, useState } from "react";
import api from "@/services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "client" | "freelancer";
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>; // ✅ ADD
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 🔐 Check session on app load
   */
  const fetchSession = async () => {
    try {
      const res = await api.get("/auth/check-session");
      setUser(res.data.user);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setUser(null); // normal unauthenticated state
      } else {
        console.error("Session check failed", err);
      }
    }
  };

  useEffect(() => {
    fetchSession().finally(() => setLoading(false));
  }, []);

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
