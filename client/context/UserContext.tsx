"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import api from "@/services/api";

// 🧠 Define user type
interface User {
  _id?: string;
  email: string;
  name: string;
  role: string;
  city?: string;
}

// 🎯 Define context type
interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<void>;
  loading: boolean;
}

// ✅ Create and export context
export const UserContext = createContext<UserContextType | null>(null);

// ✅ Provider
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔍 Check active session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get("/auth/check-session");
        if (res.data.loggedIn) {
          setUser(res.data.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // 🚪 Logout
const logout = async () => {
  try {
    await api.get("/auth/logout");
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    setUser(null);
    // Trigger session recheck
    const res = await api.get("/auth/check-session");
    if (!res.data.loggedIn) {
      window.location.href = "/login";
    }
  }
};

  return (
    <UserContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};