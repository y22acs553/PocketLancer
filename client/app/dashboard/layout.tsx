"use client";

import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-bold">
          <Loader2 className="animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ✅ pass theme + toggleTheme to header */}
      <DashboardHeader />

      <main className="w-full px-4 sm:px-6 lg:px-12 py-8">{children}</main>
    </div>
  );
}
