"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
console.log("PUBLIC FREELANCER PROFILE PAGE HIT");

export default function PublicFreelancerProfile() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/freelancers/${id}`);
        setProfile(res.data.profile);
      } catch {
        router.replace("/search");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, router]);

  if (loading) {
    return <p className="p-6">Loading…</p>;
  }

  if (!profile) return null;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold">{profile.name}</h1>

        <p className="text-slate-600">{profile.title || "Freelancer"}</p>

        <p className="mt-4">{profile.bio || "No bio provided."}</p>

        <p className="mt-4 font-semibold">₹{profile.hourlyRate}/hr</p>

        <p className="mt-2 text-slate-500">
          📍 {profile.city}, {profile.country}
        </p>

        {/* CLIENT ACTION */}
        {user?.role === "client" && (
          <button
            onClick={() => router.push(`/book/${id}`)}
            className="mt-6 rounded bg-brand-primary px-6 py-3 font-semibold text-white hover:bg-blue-600"
          >
            Book Freelancer
          </button>
        )}
      </div>
    </div>
  );
}
