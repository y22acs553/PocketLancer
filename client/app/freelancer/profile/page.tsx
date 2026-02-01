"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import { getCurrentLocation, reverseGeocode } from "@/utils/geolocation";

type Profile = {
  title: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  latitude: number | null;
  longitude: number | null;
  city: string;
  country: string;
};

export default function FreelancerProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const [locationStatus, setLocationStatus] = useState<
    "idle" | "fetching" | "ready" | "error"
  >("idle");

  const [error, setError] = useState("");

  /* ----------------------------------------
     AUTH + ROLE GUARD
  ----------------------------------------- */
  useEffect(() => {
    if (!loading && (!user || user.role !== "freelancer")) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  /* ----------------------------------------
     LOAD PROFILE (OR INIT EMPTY)
  ----------------------------------------- */
  useEffect(() => {
    if (user?.role !== "freelancer") return;

    api
      .get("/freelancers/me")
      .then((res) => {
        const loaded: Profile = res.data.profile;

        setProfile(loaded);

        // ✅ Only mark ready if coords exist
        if (loaded?.latitude != null && loaded?.longitude != null) {
          setLocationStatus("ready");
        } else {
          setLocationStatus("idle");
        }
      })
      .catch(() => {
        setProfile({
          title: "",
          bio: "",
          skills: [],
          hourlyRate: 0,
          latitude: null,
          longitude: null,
          city: "",
          country: "",
        });
        setLocationStatus("idle");
      });
  }, [user]);

  /* ----------------------------------------
     LOCATION FETCH
  ----------------------------------------- */
  const fetchLocation = async () => {
    try {
      setLocationStatus("fetching");
      setError("");

      const { latitude, longitude } = await getCurrentLocation();

      // ✅ Always store coords immediately
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              latitude,
              longitude,
            }
          : prev,
      );

      // Reverse geocode is OPTIONAL (do not block saving)
      try {
        const { city, country } = await reverseGeocode(latitude, longitude);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                city,
                country,
              }
            : prev,
        );
      } catch (e) {
        // Ignore reverse geocode failure in production/incognito
      }

      setLocationStatus("ready");
    } catch (err: any) {
      setLocationStatus("error");
      setError(
        "Unable to fetch location. Please allow location access and try again.",
      );
    }
  };

  /* ----------------------------------------
     SAVE PROFILE
  ----------------------------------------- */
  const saveProfile = async () => {
    if (!profile) return;

    if (profile.latitude == null || profile.longitude == null) {
      setError("Please allow location access before saving.");
      setLocationStatus("idle");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.put("/freelancers/me", profile);
      router.push("/dashboard");
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------------
     RENDER STATES
  ----------------------------------------- */
  if (loading || !profile) {
    return <p className="p-6">Loading profile…</p>;
  }

  const hasCoords = profile.latitude != null && profile.longitude != null;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-semibold text-slate-900">
        Freelancer Profile
      </h1>

      {/* LOCATION */}
      <div className="mb-6 rounded-xl border bg-white p-4">
        <h2 className="mb-2 font-semibold">Location (Required)</h2>

        {!hasCoords && (
          <button
            type="button"
            onClick={fetchLocation}
            disabled={locationStatus === "fetching"}
            className="rounded bg-brand-primary px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locationStatus === "fetching"
              ? "Fetching location…"
              : "Use my current location"}
          </button>
        )}

        {hasCoords && (
          <p className="text-slate-700">
            📍 {profile.city ? profile.city : "Detected"},{" "}
            {profile.country ? profile.country : "Location"}
          </p>
        )}

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* PROFILE FORM */}
      <div className="space-y-4 rounded-xl bg-white p-6 shadow">
        <input
          className="w-full rounded border p-2"
          placeholder="Professional title"
          value={profile.title}
          onChange={(e) => setProfile({ ...profile, title: e.target.value })}
        />

        <textarea
          className="w-full rounded border p-2"
          placeholder="Bio"
          rows={4}
          value={profile.bio}
          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
        />

        <input
          className="w-full rounded border p-2"
          placeholder="Skills (comma separated)"
          value={profile.skills.join(", ")}
          onChange={(e) =>
            setProfile({
              ...profile,
              skills: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />

        <input
          type="number"
          className="w-full rounded border p-2"
          placeholder="Hourly rate"
          value={profile.hourlyRate}
          onChange={(e) =>
            setProfile({
              ...profile,
              hourlyRate: Number(e.target.value),
            })
          }
        />

        <button
          type="button"
          disabled={saving || !hasCoords}
          onClick={saveProfile}
          className="rounded bg-brand-primary px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
