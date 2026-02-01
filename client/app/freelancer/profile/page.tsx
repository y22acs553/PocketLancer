"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import {
  Camera,
  MapPin,
  Star,
  BadgeCheck,
  Briefcase,
  Link as LinkIcon,
  Plus,
  Trash2,
  Loader2,
  X,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Info,
} from "lucide-react";
import Image from "next/image";
import { getCurrentLocation, reverseGeocode } from "@/utils/geolocation";

type Review = {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
  clientName?: string;
};

type PastWork = {
  title: string;
  description: string;
  link?: string;
  year?: string;
};

type Profile = {
  _id?: string;
  name?: string;
  title: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  latitude: number | null;
  longitude: number | null;
  city: string;
  country: string;
  profilePic?: string;
  portfolio?: string[];
  pastWorks?: PastWork[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function FreelancerProfilePage() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPic, setUploadingPic] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const [locationStatus, setLocationStatus] = useState<
    "idle" | "fetching" | "ready" | "error"
  >("idle");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // ---------------------------
  // rating summary
  // ---------------------------
  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const avg =
      reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length;
    return { avg: Number(avg.toFixed(1)), count: reviews.length };
  }, [reviews]);

  // ---------------------------
  // AUTH GUARD
  // ---------------------------
  useEffect(() => {
    if (!loading && (!user || user.role !== "freelancer")) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  // ---------------------------
  // LOAD PROFILE
  // ---------------------------
  useEffect(() => {
    if (user?.role !== "freelancer") return;

    api
      .get("/freelancers/me")
      .then((res) => {
        const loaded: Profile = res.data.profile;

        setProfile({
          ...loaded,
          name: loaded?.name || user?.name || "Freelancer",
          portfolio: loaded?.portfolio || [],
          pastWorks: loaded?.pastWorks || [],
          profilePic: loaded?.profilePic || "",
        });

        const hasCoords = loaded?.latitude != null && loaded?.longitude != null;
        setLocationStatus(hasCoords ? "ready" : "idle");
      })
      .catch(() => {
        setProfile({
          name: user?.name || "Freelancer",
          title: "",
          bio: "",
          skills: [],
          hourlyRate: 0,
          latitude: null,
          longitude: null,
          city: "",
          country: "",
          profilePic: "",
          portfolio: [],
          pastWorks: [],
        });
        setLocationStatus("idle");
      });
  }, [user]);

  // ---------------------------
  // LOAD REVIEWS
  // ---------------------------
  useEffect(() => {
    const loadReviews = async () => {
      try {
        if (!profile?._id) return;

        setLoadingReviews(true);
        const res = await api.get(`/reviews/freelancer/${profile._id}`);
        setReviews(res.data?.data || []);
      } catch {
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    loadReviews();
  }, [profile?._id]);

  // ---------------------------
  // Upload profile pic
  // ---------------------------
  const uploadProfilePic = async (file: File) => {
    try {
      setUploadingPic(true);

      const form = new FormData();
      form.append("image", file);

      const res = await api.post("/uploads/profile-pic", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setProfile((prev) =>
        prev ? { ...prev, profilePic: res.data.profilePic } : prev,
      );
    } catch (err: any) {
      alert(err?.response?.data?.msg || "Failed to upload profile picture");
    } finally {
      setUploadingPic(false);
    }
  };

  const removeProfilePic = async () => {
    try {
      setUploadingPic(true);
      await api.delete("/uploads/profile-pic");

      setProfile((prev) => (prev ? { ...prev, profilePic: "" } : prev));
    } catch (err: any) {
      alert(err?.response?.data?.msg || "Failed to remove profile picture");
    } finally {
      setUploadingPic(false);
    }
  };

  // ---------------------------
  // Skills
  // ---------------------------
  const addSkill = () => {
    const skill = skillInput.trim();
    if (!skill) return;

    setProfile((prev) => {
      if (!prev) return prev;

      const existing = (prev.skills || []).map((s) => s.toLowerCase());
      if (existing.includes(skill.toLowerCase())) return prev;

      return { ...prev, skills: [...(prev.skills || []), skill] };
    });

    setSkillInput("");
  };

  const addSuggestedSkill = (skill: string) => {
    setProfile((prev) => {
      if (!prev) return prev;

      const existing = (prev.skills || []).map((s) => s.toLowerCase());
      if (existing.includes(skill.toLowerCase())) return prev;

      return { ...prev, skills: [...(prev.skills || []), skill] };
    });
  };

  const removeSkill = (idx: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = [...(prev.skills || [])];
      updated.splice(idx, 1);
      return { ...prev, skills: updated };
    });
  };

  const suggestedSkills = useMemo(() => {
    const title = (profile?.title || "").toLowerCase();
    const portfolio = (profile?.portfolio || []).join(" ").toLowerCase();

    const bag = new Set<string>();

    [
      "Punctuality",
      "Professionalism",
      "Customer Support",
      "Safety Compliance",
      "Problem Solving",
      "Time Management",
    ].forEach((s) => bag.add(s));

    if (title.includes("electric") || portfolio.includes("electric")) {
      [
        "Wiring",
        "Switch Board Repair",
        "Fan Installation",
        "Light Installation",
        "MCB/Fuse Repair",
        "Electrical Troubleshooting",
      ].forEach((s) => bag.add(s));
    }

    if (title.includes("plumb") || portfolio.includes("plumb")) {
      [
        "Pipe Fixing",
        "Leak Repair",
        "Tap Repair",
        "Bathroom Fittings",
        "Water Tank Maintenance",
        "Drain Cleaning",
      ].forEach((s) => bag.add(s));
    }

    if (
      title.includes("ac") ||
      title.includes("air") ||
      portfolio.includes("ac")
    ) {
      [
        "AC Installation",
        "AC Servicing",
        "Gas Refill",
        "Split AC Repair",
        "Cooling Issue Diagnosis",
      ].forEach((s) => bag.add(s));
    }

    if (title.includes("carpent") || portfolio.includes("wood")) {
      [
        "Furniture Repair",
        "Door Installation",
        "Cupboard Work",
        "Wood Polishing",
      ].forEach((s) => bag.add(s));
    }

    if (title.includes("clean") || portfolio.includes("clean")) {
      ["Home Cleaning", "Kitchen Cleaning", "Bathroom Cleaning"].forEach((s) =>
        bag.add(s),
      );
    }

    const current = new Set(
      (profile?.skills || []).map((s) => s.toLowerCase()),
    );

    return Array.from(bag)
      .filter((s) => !current.has(s.toLowerCase()))
      .slice(0, 12);
  }, [profile?.title, profile?.portfolio, profile?.skills]);

  // ---------------------------
  // Location
  // ---------------------------
  const fetchLocation = async () => {
    try {
      setLocationStatus("fetching");
      setError("");

      const { latitude, longitude } = await getCurrentLocation();

      setProfile((prev) => (prev ? { ...prev, latitude, longitude } : prev));

      try {
        const { city, country } = await reverseGeocode(latitude, longitude);
        setProfile((prev) => (prev ? { ...prev, city, country } : prev));
      } catch {}

      setLocationStatus("ready");
    } catch {
      setLocationStatus("error");
      setError(
        "Unable to fetch location. Please allow location access and retry.",
      );
    }
  };

  // ---------------------------
  // Save profile
  // ---------------------------
  const saveProfile = async () => {
    if (!profile) return;

    if (profile.latitude == null || profile.longitude == null) {
      setError("Please allow location access before saving.");
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

  // ---------------------------
  // Portfolio + Past works
  // ---------------------------
  const addPortfolioItem = () => {
    setProfile((prev) => {
      if (!prev) return prev;
      return { ...prev, portfolio: [...(prev.portfolio || []), ""] };
    });
  };

  const removePortfolioItem = (idx: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const items = [...(prev.portfolio || [])];
      items.splice(idx, 1);
      return { ...prev, portfolio: items };
    });
  };

  const addPastWork = () => {
    setProfile((prev) => {
      if (!prev) return prev;
      const works = [...(prev.pastWorks || [])];
      works.unshift({ title: "", description: "", link: "", year: "" });
      return { ...prev, pastWorks: works };
    });
  };

  const removePastWork = (idx: number) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const works = [...(prev.pastWorks || [])];
      works.splice(idx, 1);
      return { ...prev, pastWorks: works };
    });
  };

  // ---------------------------
  // render guards
  // ---------------------------
  if (loading || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-slate-600 dark:text-slate-300">
        <Loader2 className="animate-spin" />
        <p className="font-black">Loading profile…</p>
      </div>
    );
  }

  const hasCoords = profile.latitude != null && profile.longitude != null;

  const completion = (() => {
    let score = 0;
    if (profile.profilePic) score += 18;
    if (profile.title?.trim()) score += 14;
    if (profile.bio?.trim() && profile.bio.trim().length >= 30) score += 14;
    if (profile.skills?.length >= 5) score += 18;
    if ((profile.portfolio || []).filter(Boolean).length >= 2) score += 14;
    if ((profile.pastWorks || []).length >= 2) score += 12;
    if (hasCoords) score += 10;
    return clamp(score, 0, 100);
  })();

  const canSave = hasCoords;

  const shellCard =
    "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950";
  const innerCard =
    "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950";

  return (
    <div className="w-full">
      {/* HERO SHELL */}
      <div className={`relative overflow-hidden ${shellCard}`}>
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-44 -left-44 h-[32rem] w-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Header */}
        <div className="relative border-b border-slate-200 px-6 py-7 lg:px-10 lg:py-9 dark:border-white/10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <Sparkles size={16} className="text-blue-500" />
                Freelancer Profile
              </p>

              <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Build a profile that converts
              </h1>

              <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                Profile + portfolio + reviews = higher acceptance and more
                bookings.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving || !canSave}
                onClick={saveProfile}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white dark:text-slate-900"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Saving…
                  </>
                ) : (
                  <>
                    <BadgeCheck size={18} />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </div>

          {/* completion */}
          <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                      Profile Completion
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {completion}%
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                      Reach 80%+ to rank higher in search results.
                    </p>
                  </div>

                  {!hasCoords ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-700 ring-1 ring-red-500/20 dark:text-red-300">
                      <ShieldCheck size={16} />
                      Location Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                      <BadgeCheck size={16} />
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>

                {!hasCoords && (
                  <div className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 ring-1 ring-red-500/20">
                    <p className="text-sm font-bold text-red-700 dark:text-red-200">
                      Your profile is hidden until you enable location.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Quick rating
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star
                      size={18}
                      className="text-amber-500"
                      fill="currentColor"
                    />
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      {ratingSummary.avg}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {ratingSummary.count} reviews
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                  <Briefcase size={18} className="text-slate-400" />
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    ₹{profile.hourlyRate || 0}/hr
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="relative grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-12 lg:px-10">
          {/* LEFT */}
          <div className="lg:col-span-8 space-y-6">
            {/* identity */}
            <div className={innerCard}>
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                {/* avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative h-28 w-28 overflow-hidden rounded-3xl bg-slate-100 ring-1 ring-black/10 dark:bg-slate-900 dark:ring-white/10">
                    {profile.profilePic ? (
                      <Image
                        src={profile.profilePic}
                        alt="Profile"
                        fill
                        sizes="112px"
                        priority
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Camera className="text-slate-400" size={30} />
                      </div>
                    )}

                    {/* actions */}
                    {profile.profilePic && (
                      <button
                        type="button"
                        onClick={removeProfilePic}
                        disabled={uploadingPic}
                        title="Remove photo"
                        className="absolute left-2 top-2 rounded-2xl bg-red-600 p-2 text-white shadow hover:bg-red-700 disabled:opacity-60"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    <label className="absolute bottom-2 right-2 cursor-pointer rounded-2xl bg-slate-900 p-2 text-white shadow hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                      {uploadingPic ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <UploadCloud size={16} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadProfilePic(file);
                        }}
                      />
                    </label>
                  </div>

                  {/* name */}
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                      Account
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                      {profile.name}
                    </h2>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                        <BadgeCheck size={14} />
                        Verified
                      </span>

                      {completion >= 80 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-500/20 dark:text-blue-300">
                          High ranking profile
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* title + location */}
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-extrabold text-slate-700 dark:text-slate-200">
                      Professional title
                    </label>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                      placeholder="Example: Electrician | Plumbing Expert"
                      value={profile.title}
                      onChange={(e) =>
                        setProfile({ ...profile, title: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                        Location
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                        <MapPin size={16} className="text-slate-400" />
                        {profile.city && profile.country
                          ? `${profile.city}, ${profile.country}`
                          : "Not set"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                        Hourly rate
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          ₹
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={profile.hourlyRate}
                          onChange={(e) =>
                            setProfile({
                              ...profile,
                              hourlyRate: Number(e.target.value),
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                        />
                        <span className="text-xs font-extrabold text-slate-400">
                          /hr
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* error */}
                  {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-200">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className={innerCard}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Bio
                </h3>
                <span className="text-xs font-extrabold text-slate-400">
                  {profile.bio?.trim()?.length || 0}/300
                </span>
              </div>

              <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                A strong bio increases acceptance rate & trust.
              </p>

              <textarea
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                rows={6}
                maxLength={300}
                placeholder="Write about your experience, expertise, and professionalism."
                value={profile.bio}
                onChange={(e) =>
                  setProfile({ ...profile, bio: e.target.value })
                }
              />
            </div>

            {/* Skills */}
            <div className={innerCard}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Skills
                  </h3>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    Add at least 5 skills for better search visibility.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addSkill}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Plus size={18} />
                  Add skill
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  placeholder="Enter a skill (ex: Plumbing)"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
              </div>

              {suggestedSkills.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    Suggested
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestedSkills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSuggestedSkill(s)}
                        className="rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-500/20 hover:bg-blue-500/15 dark:text-blue-300"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(profile.skills || []).length === 0 ? (
                <p className="mt-4 text-sm font-bold text-slate-500">
                  No skills added yet.
                </p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSkill(idx)}
                        className="rounded-full p-1 hover:bg-slate-200 dark:hover:bg-white/10"
                        title="Remove skill"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Portfolio */}
            <div className={innerCard}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Portfolio
                  </h3>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    Showcase services you provide.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addPortfolioItem}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>

              {(profile.portfolio || []).length === 0 ? (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
                  Add 2+ items to improve client trust.
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(profile.portfolio || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-3xl bg-slate-50 p-4 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
                    >
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                          placeholder={`Portfolio item ${idx + 1}`}
                          value={item}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProfile((prev) => {
                              if (!prev) return prev;
                              const updated = [...(prev.portfolio || [])];
                              updated[idx] = val;
                              return { ...prev, portfolio: updated };
                            });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removePortfolioItem(idx)}
                          className="rounded-2xl bg-white px-4 ring-1 ring-black/10 hover:bg-red-50 dark:bg-slate-950 dark:ring-white/10 dark:hover:bg-red-500/10"
                          title="Remove"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past works */}
            <div className={innerCard}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Past Works
                  </h3>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    Add projects to prove experience.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addPastWork}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Plus size={18} />
                  Add Work
                </button>
              </div>

              {(profile.pastWorks || []).length === 0 ? (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
                  Add at least 2 past works for higher booking success.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {(profile.pastWorks || []).map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded-3xl bg-slate-50 p-5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                          placeholder="Work title"
                          value={w.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProfile((prev) => {
                              if (!prev) return prev;
                              const works = [...(prev.pastWorks || [])];
                              works[idx] = { ...works[idx], title: val };
                              return { ...prev, pastWorks: works };
                            });
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => removePastWork(idx)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-red-600 ring-1 ring-black/10 hover:bg-red-50 dark:bg-slate-950 dark:ring-white/10 dark:hover:bg-red-500/10"
                        >
                          <Trash2 size={18} />
                          Remove
                        </button>
                      </div>

                      <textarea
                        className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                        rows={4}
                        placeholder="Work description"
                        value={w.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProfile((prev) => {
                            if (!prev) return prev;
                            const works = [...(prev.pastWorks || [])];
                            works[idx] = { ...works[idx], description: val };
                            return { ...prev, pastWorks: works };
                          });
                        }}
                      />

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                          placeholder="Year (optional)"
                          value={w.year || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProfile((prev) => {
                              if (!prev) return prev;
                              const works = [...(prev.pastWorks || [])];
                              works[idx] = { ...works[idx], year: val };
                              return { ...prev, pastWorks: works };
                            });
                          }}
                        />

                        <div className="flex gap-2">
                          <div className="inline-flex items-center justify-center rounded-2xl bg-white px-4 ring-1 ring-black/10 dark:bg-slate-950 dark:ring-white/10">
                            <LinkIcon size={18} className="text-slate-400" />
                          </div>
                          <input
                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                            placeholder="Link (optional)"
                            value={w.link || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProfile((prev) => {
                                if (!prev) return prev;
                                const works = [...(prev.pastWorks || [])];
                                works[idx] = { ...works[idx], link: val };
                                return { ...prev, pastWorks: works };
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className={innerCard}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Location (Required)
                  </h3>
                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    Your profile will be searchable only after enabling
                    location.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchLocation}
                  disabled={locationStatus === "fetching"}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {locationStatus === "fetching" ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Detecting…
                    </>
                  ) : (
                    <>
                      <MapPin size={18} />
                      Enable
                    </>
                  )}
                </button>
              </div>

              {!hasCoords ? (
                <div className="mt-5 rounded-3xl bg-red-500/10 p-4 ring-1 ring-red-500/20">
                  <p className="text-sm font-black text-red-700 dark:text-red-200">
                    Location not set. Enable it to activate your profile.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-3xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
                  <p className="text-sm font-black text-emerald-800 dark:text-emerald-200">
                    📍 {profile.city || "Detected"}{" "}
                    {profile.country ? `, ${profile.country}` : ""}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              {/* Reviews */}
              <div className={innerCard}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Reviews
                  </h3>

                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
                    <Star size={14} fill="currentColor" />
                    {ratingSummary.avg} ({ratingSummary.count})
                  </div>
                </div>

                {loadingReviews ? (
                  <div className="mt-5 flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Loader2 className="animate-spin" size={18} />
                    Loading reviews...
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
                    No reviews yet.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {reviews.slice(0, 8).map((r) => (
                      <div
                        key={r._id}
                        className="rounded-3xl bg-slate-50 p-4 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                            {r.clientName || "Anonymous"}
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-black text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
                            <Star size={14} fill="currentColor" />
                            {r.rating}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300 line-clamp-4">
                          {r.comment || "No comment"}
                        </p>

                        <p className="mt-3 text-xs font-extrabold text-slate-400">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm dark:bg-white dark:text-slate-900">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-white/10 p-2 dark:bg-slate-900/10">
                    <Info size={18} />
                  </div>
                  <div>
                    <p className="font-black">Profile tips</p>
                    <ul className="mt-2 space-y-1 text-sm font-bold opacity-90">
                      <li>• Add at least 5 skills</li>
                      <li>• Add 2+ past works with links</li>
                      <li>• Keep bio above 60 characters</li>
                      <li>• Enable location to appear in search</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Security note */}
              <div className={innerCard}>
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Safety reminder
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                      Always confirm scope and pricing in chat before traveling.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* end shell */}
    </div>
  );
}
