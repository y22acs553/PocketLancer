"use client";

import { useRouter } from "next/navigation";

export default function FreelancerCard({ freelancer }: { freelancer: any }) {
  const router = useRouter();

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition">
      <h2 className="text-lg font-semibold">{freelancer.user?.name}</h2>

      <p className="text-sm text-slate-600">
        {freelancer.title || "Freelancer"}
      </p>

      <p className="text-sm text-slate-500 mt-1">
        📍 {freelancer.city} · {freelancer.distanceKm} km away
      </p>

      <p className="mt-2 font-medium">₹{freelancer.hourlyRate}/hr</p>

      {/* ✅ VIEW PROFILE BUTTON */}
      <button
        // ✅ CORRECT
        onClick={() => router.push(`/freelancer/${freelancer._id}`)}
        className="mt-4 w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
      >
        View Profile
      </button>
    </div>
  );
}
