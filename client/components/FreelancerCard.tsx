"use client";

import { useRouter } from "next/navigation";
import {
  MapPin,
  Star,
  IndianRupee,
  ArrowRight,
  BadgeCheck,
} from "lucide-react";

export default function FreelancerCard({ freelancer }: { freelancer: any }) {
  const router = useRouter();

  const name = freelancer?.user?.name || "Freelancer";
  const title = freelancer?.title || "Professional Freelancer";
  const city = freelancer?.city || "Unknown";
  const distanceKm =
    typeof freelancer?.distanceKm === "number"
      ? `${freelancer.distanceKm} km`
      : null;

  const rate =
    typeof freelancer?.hourlyRate === "number" ? freelancer.hourlyRate : null;

  const rating =
    typeof freelancer?.rating === "number" ? freelancer.rating : null;

  const skills: string[] = Array.isArray(freelancer?.skills)
    ? freelancer.skills
    : [];

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-slate-950 dark:ring-white/10">
      {/* glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl opacity-0 transition group-hover:opacity-100" />
      <div className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl opacity-0 transition group-hover:opacity-100" />

      <div className="relative p-6">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-black text-slate-900 dark:text-white">
                {name}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20">
                <BadgeCheck size={12} />
                VERIFIED
              </span>
            </div>

            <p className="mt-1 truncate text-sm font-bold text-slate-600 dark:text-slate-300">
              {title}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2">
                <MapPin size={16} className="text-slate-400" />
                {city}
                {distanceKm ? (
                  <span className="text-slate-400">· {distanceKm}</span>
                ) : null}
              </span>

              {rating !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20">
                  <Star size={14} className="text-amber-500" />
                  {rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Avatar */}
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black dark:bg-white dark:text-slate-900">
            {(name || "F").slice(0, 1).toUpperCase()}
          </div>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.slice(0, 6).map((s: string) => (
              <span
                key={s}
                className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {s}
              </span>
            ))}
            {skills.length > 6 && (
              <span className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-black/5 dark:bg-slate-900 dark:text-slate-400 dark:ring-white/10">
                +{skills.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* Price + buttons */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Hourly Rate
            </p>

            <p className="mt-1 flex items-center gap-1 text-base font-black text-slate-900 dark:text-white">
              <IndianRupee size={16} className="text-slate-400" />
              {rate !== null ? rate : "Negotiable"}
              {rate !== null && (
                <span className="text-xs font-extrabold text-slate-400">
                  /hr
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/f/${freelancer._id}`)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
            >
              View Profile
            </button>

            <button
              onClick={() => router.push(`/book/${freelancer._id}`)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900"
            >
              Book Now
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
