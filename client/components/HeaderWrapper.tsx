"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function HeaderWrapper() {
  const pathname = usePathname();

  // ✅ Hide header in dashboard routes
  if (pathname?.startsWith("/dashboard")) return null;

  return <Header />;
}
