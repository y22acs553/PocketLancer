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

  // ✅ Use stable primitives — never put the `user` object itself in deps.
  //    Object reference changes on every context render, causing this effect
  //    to fire repeatedly which floods the router and freezes navigation.
  const userId = user?._id ?? null;
  const userRole = user?.role ?? null;

  useEffect(() => {
    if (loading) return;
    if (isPublicProfile) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    if (userRole !== "freelancer") {
      router.replace("/dashboard");
    }
  }, [loading, userId, userRole, isPublicProfile, router]);

  // Prevent flash
  if (loading) return null;

  if (!isPublicProfile && (!user || user.role !== "freelancer")) {
    return null;
  }

  return <>{children}</>;
}
