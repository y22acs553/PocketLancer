// client/app/search/page.tsx
// NOTE: Only change here is adding the outer padding container.
// The full component logic is unchanged — it receives this from the existing file.
// This file wraps the content in a properly padded, max-width container.

"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/services/api";
import { getCurrentLocation } from "@/utils/geolocation";
import FreelancerCard from "@/components/FreelancerCard";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  RefreshCcw,
  Users,
  LocateFixed,
  ArrowDownUp,
} from "lucide-react";

type SortMode = "nearest" | "cheapest" | "toprated";

const FreelancerMiniMap = dynamic(
  () => import("@/components/FreelancerMiniMap"),
  { ssr: false },
);

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-slate-950 dark:ring-white/10">
      <div className="animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="w-full">
            <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-3 w-64 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-4 h-3 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="mt-5 flex gap-2">
          <div className="h-7 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-7 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-7 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="h-12 w-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="flex gap-3">
            <div className="h-12 w-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-12 w-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [radiusKm, setRadiusKm] = useState(10);
  const [skills, setSkills] = useState("");
  const [error, setError] = useState("");

  const [sortMode, setSortMode] = useState<SortMode>("nearest");
  const [category, setCategory] = useState<"field" | "digital">("field");

  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const applySort = (items: any[]) => {
    const list = [...items];
    if (sortMode === "nearest")
      list.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
    if (sortMode === "cheapest")
      list.sort((a, b) => (a.hourlyRate ?? 999999) - (b.hourlyRate ?? 999999));
    if (sortMode === "toprated")
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  };

  const searchNearby = async () => {
    try {
      setLoading(true);
      setError("");

      const params: any = { category, skills };

      if (category === "field") {
        const pos = coords ?? (await getCurrentLocation());
        setCoords(pos);
        params.latitude = pos.latitude;
        params.longitude = pos.longitude;
        params.radiusKm = radiusKm;
      }

      const res = await api.get("/freelancers/search", { params });
      const list = res.data.freelancers || [];
      setFreelancers(applySort(list));
    } catch {
      setError(
        category === "field"
          ? "Unable to fetch freelancers. Please allow location access."
          : "Unable to fetch freelancers.",
      );
      setFreelancers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setFreelancers((prev) => applySort(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode]);

  useEffect(() => {
    searchNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const headerTitle = useMemo(() => {
    if (skills.trim()) return `Freelancers for "${skills.trim()}"`;
    return "Find Freelancers Near You";
  }, [skills]);

  const subtitle = useMemo(() => {
    if (category === "digital") {
      if (sortMode === "cheapest") return "Sorted by lowest hourly rate";
      if (sortMode === "toprated") return "Sorted by highest rating";
      return "Sorted by relevance";
    }
    if (sortMode === "nearest") return "Sorted by nearest professionals";
    if (sortMode === "cheapest") return "Sorted by lowest hourly rate";
    return "Sorted by highest rating";
  }, [sortMode, category]);

  return (
    // ✅ Consistent padding + max-width container for all screen sizes
    <div className="max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-8">
      {/* HERO card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        <div className="absolute -top-36 -right-36 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-44 -left-44 h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* TOP SECTION */}
        <div className="relative px-5 py-8 sm:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* LEFT SIDE */}
            <div className="lg:col-span-7 space-y-6">
              {/* HERO TEXT */}
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  PocketLancer Search
                </p>
                <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl dark:text-white">
                  {headerTitle}
                </h1>
                <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  Search local verified professionals, compare pricing, then
                  book instantly.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <Users size={14} className="text-slate-400" />
                    Real profiles
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <MapPin size={14} className="text-slate-400" />
                    Nearby results
                  </span>
                </div>
              </div>

              {/* FILTER PANEL */}
              <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
                {/* Category toggle */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCategory("field")}
                      className={`px-4 py-2 rounded-2xl text-sm font-bold transition ${
                        category === "field"
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      Field Services
                    </button>
                    <button
                      onClick={() => setCategory("digital")}
                      className={`px-4 py-2 rounded-2xl text-sm font-bold transition ${
                        category === "digital"
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      Digital Services
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSkills("");
                      setRadiusKm(10);
                      setSortMode("nearest");
                      setError("");
                      setFreelancers([]);
                      searchNearby();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5 transition"
                  >
                    <RefreshCcw size={14} />
                    Reset
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Skills */}
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                      Skills / Service
                    </label>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 dark:border-white/10 dark:bg-slate-900">
                      <Search size={16} className="text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="electrician, plumber, developer..."
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") searchNearby();
                        }}
                        className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Radius */}
                  {category === "field" && (
                    <div>
                      <label className="mb-2 block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                        Radius (km)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Number(e.target.value))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {/* Sort */}
                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-widest text-slate-400">
                      Sort by
                    </label>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900">
                      <ArrowDownUp size={16} className="text-slate-400 shrink-0" />
                      <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as SortMode)}
                        className="w-full bg-transparent text-sm font-black text-slate-900 outline-none dark:text-white"
                      >
                        <option value="nearest">Nearest</option>
                        <option value="cheapest">Cheapest</option>
                        <option value="toprated">Top Rated</option>
                      </select>
                    </div>
                  </div>

                  {/* Location refresh */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setCoords(null);
                        await searchNearby();
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5 transition"
                    >
                      <LocateFixed size={16} className="text-slate-400" />
                      Refresh GPS
                    </button>
                  </div>

                  {/* Search */}
                  <div className="sm:col-span-2">
                    <button
                      onClick={searchNearby}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition"
                    >
                      <SlidersHorizontal size={16} />
                      Search Freelancers
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE MINI MAP */}
            <div className="lg:col-span-5">
              {category === "field" ? (
                coords ? (
                  <FreelancerMiniMap
                    center={coords}
                    freelancers={freelancers}
                  />
                ) : (
                  <div className="h-[500px] w-full rounded-3xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900 flex items-center justify-center text-sm font-bold text-slate-400 gap-2">
                    <LocateFixed size={18} className="animate-pulse" />
                    Fetching GPS…
                  </div>
                )
              ) : (
                <div className="h-[500px] w-full rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 shadow-sm flex flex-col items-center justify-center gap-3 text-sm font-bold text-slate-500">
                  <Globe size={32} className="text-slate-300" />
                  Digital services do not use location.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RESULTS */}
        <div className="relative border-t border-slate-200 px-5 py-8 sm:px-8 dark:border-white/10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Results{" "}
                <span className="text-slate-400">
                  ({loading ? "..." : freelancers.length})
                </span>
              </p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {freelancers.map((f) => (
                  <FreelancerCard key={f._id} freelancer={f} />
                ))}
              </div>

              {!error && freelancers.length === 0 && (
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-slate-950">
                  <p className="text-lg font-black text-slate-900 dark:text-white">
                    No freelancers found
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                    Try increasing radius or using a different skill keyword.
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => {
                        setRadiusKm((r) => Math.min(100, r + 10));
                        searchNearby();
                      }}
                      className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                    >
                      Increase Radius +10km
                    </button>
                    <button
                      onClick={() => {
                        setSkills("");
                        searchNearby();
                      }}
                      className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                    >
                      Clear Skills
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Fix: Globe icon was referenced but not imported in the original file's digital section
function Globe({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
