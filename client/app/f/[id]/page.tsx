"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import Image from "next/image";
import {
  MapPin,
  Star,
  Briefcase,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";

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
  id: string;
  name: string;
  title: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  city: string;
  country: string;
  profilePic?: string;
  portfolio?: string[];
  pastWorks?: PastWork[];
};

export default function PublicFreelancerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const cardClass =
    "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 hover:shadow-md transition-all";

  const ratingSummary = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const avg =
      reviews.reduce((a, r) => a + (r.rating || 0), 0) / reviews.length;
    return { avg: Number(avg.toFixed(1)), count: reviews.length };
  }, [reviews]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/freelancers/${id}`);
        setProfile(res.data.profile);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id, router]);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        if (!id) return;
        setLoadingReviews(true);
        const res = await api.get(`/reviews/freelancer/${id}`);
        setReviews(res.data?.data || []);
      } catch {
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    loadReviews();
  }, [id]);

  if (loading || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-slate-600">
        <Loader2 className="animate-spin" />
        Loading freelancer profile…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          {profile.name}
        </h1>
        <p className="text-slate-500 mt-2">Freelancer profile</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 80% */}
        <div className="lg:col-span-9 space-y-6">
          {/* Identity Card */}
          <div className={cardClass}>
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="relative h-36 w-36 overflow-hidden rounded-3xl bg-slate-50 ring-1 ring-black/10 flex items-center justify-center">
                {profile.profilePic ? (
                  <Image
                    src={profile.profilePic}
                    alt="Profile"
                    fill
                    sizes="144px"
                    priority
                    className="object-cover"
                  />
                ) : (
                  <span className="text-slate-400 font-bold text-xl">
                    {profile.name?.[0] || "F"}
                  </span>
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {profile.title || "Freelancer"}
                </h2>

                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-700">
                    <MapPin size={16} />
                    {profile.city && profile.country
                      ? `${profile.city}, ${profile.country}`
                      : "Location not available"}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-slate-700">
                    <Briefcase size={16} />₹{profile.hourlyRate || 0}/hr
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-amber-700">
                    <Star size={16} fill="currentColor" />
                    {ratingSummary.avg} ({ratingSummary.count})
                  </span>
                </div>

                <button
                  onClick={() => router.push(`/book/${profile.id}`)}
                  className="mt-5 rounded-2xl bg-blue-600 px-6 py-3 font-extrabold text-white hover:bg-blue-700 shadow"
                >
                  Book this Freelancer
                </button>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className={cardClass}>
            <h3 className="text-lg font-extrabold text-slate-900 mb-3">Bio</h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
              {profile.bio || "No bio provided yet."}
            </p>
          </div>

          {/* Skills */}
          <div className={cardClass}>
            <h3 className="text-lg font-extrabold text-slate-900 mb-3">
              Skills
            </h3>

            {profile.skills?.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No skills added.</p>
            )}
          </div>

          {/* Portfolio */}
          <div className={cardClass}>
            <h3 className="text-lg font-extrabold text-slate-900 mb-3">
              Portfolio
            </h3>

            {profile.portfolio?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.portfolio.map((p, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5 font-bold text-slate-700"
                  >
                    {p}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No portfolio added.</p>
            )}
          </div>

          {/* Past Works */}
          <div className={cardClass}>
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">
              Past Works
            </h3>

            {profile.pastWorks?.length ? (
              <div className="space-y-4">
                {profile.pastWorks.map((w, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-extrabold text-slate-900">
                          {w.title || "Work"}
                        </p>
                        {w.year && (
                          <p className="text-xs font-bold text-slate-500 mt-1">
                            {w.year}
                          </p>
                        )}
                      </div>

                      {w.link && (
                        <a
                          href={w.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50"
                        >
                          <LinkIcon size={14} />
                          View
                        </a>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                      {w.description || "No description."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No past works added.</p>
            )}
          </div>
        </div>

        {/* RIGHT 20% */}
        <div className="lg:col-span-3">
          <div className="sticky top-6 space-y-4">
            <div className={cardClass}>
              <h3 className="text-lg font-extrabold text-slate-900 mb-3">
                Reviews
              </h3>

              {loadingReviews ? (
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="animate-spin" size={18} />
                  Loading reviews...
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-slate-500">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 10).map((r) => (
                    <div
                      key={r._id}
                      className="rounded-2xl bg-slate-50 p-4 ring-1 ring-black/5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800 text-sm">
                          {r.clientName || "Anonymous"}
                        </p>

                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                          <Star size={14} fill="currentColor" />
                          {r.rating}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-600 line-clamp-4">
                        {r.comment || "No comment"}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
              <h4 className="font-extrabold mb-2">Why book this freelancer?</h4>
              <ul className="text-sm text-slate-200 space-y-1">
                <li>• Trusted reviews</li>
                <li>• Verified profile</li>
                <li>• Clear portfolio & work history</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
