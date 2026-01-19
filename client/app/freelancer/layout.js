"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function FreelancerLayout({ children }) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicProfile =
    pathname.startsWith("/freelancer/") && pathname.split("/").length === 3; // /freelancer/[id]

  useEffect(() => {
    if (loading) return;

    // ✅ PUBLIC freelancer profile → allow everyone
    if (isPublicProfile) return;

    // 🔒 Protected freelancer-only pages
    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "freelancer") {
      router.replace("/dashboard"); // NOT switch-role
    }
  }, [loading, user, isPublicProfile, router]);

  // Prevent flash
  if (loading) return null;

  if (!isPublicProfile && (!user || user.role !== "freelancer")) {
    return null;
  }

  return <>{children}</>;
}
