"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { getCurrentLocation } from "@/utils/geolocation";
import FreelancerCard from "@/components/FreelancerCard";

export default function SearchPage() {
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [skills, setSkills] = useState("");
  const [error, setError] = useState("");

  const searchNearby = async () => {
    try {
      setLoading(true);
      setError("");

      const { latitude, longitude } = await getCurrentLocation();

      const res = await api.get("/freelancers/search", {
        params: {
          latitude,
          longitude,
          radiusKm,
          skills,
        },
      });

      setFreelancers(res.data.freelancers);
    } catch {
      setError("Unable to fetch freelancers. Please allow location access.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchNearby();
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-3xl font-semibold">Find Freelancers</h1>

      {/* FILTER BAR */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Skills</label>
          <input
            type="text"
            placeholder="e.g. plumber, electrician"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Radius (km)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="mt-1 w-full rounded border p-2"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={searchNearby}
            className="w-full rounded bg-brand-primary px-4 py-2 font-semibold text-white"
          >
            Search
          </button>
        </div>
      </div>

      {loading && <p>Searching freelancers…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {freelancers.map((f) => (
          <FreelancerCard key={f._id} freelancer={f} />
        ))}
      </div>

      {!loading && freelancers.length === 0 && (
        <p className="mt-6 text-slate-600">No freelancers found.</p>
      )}
    </div>
  );
}
