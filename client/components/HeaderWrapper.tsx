"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function HeaderWrapper() {
  const pathname = usePathname();

  // ✅ Hide header in dashboard AND freelancer routes
  if (pathname?.startsWith("/dashboard")) return null;
  if (pathname?.startsWith("/freelancer")) return null;

  return <Header />;
}
