"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import PortfolioGallery from "@/components/PortfolioGallery";

export default function PublicFreelancerProfile() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await api.get(`/freelancers/${id}`);
        const profileData = profileRes.data.profile;

        setProfile(profileData);

        // use freelancer profile id
        const portfolioRes = await api.get(`/portfolio/${profileData._id}`);
        setPortfolio(portfolioRes.data || []);
      } catch {
        router.replace("/search");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  if (loading) return <p className="p-6">Loading…</p>;
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* PROFILE CARD */}
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
            className="mt-6 rounded bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Book Freelancer
          </button>
        )}
      </div>

      {/* DIGITAL PORTFOLIO */}
      {profile.category === "digital" && portfolio.length > 0 && (
        <PortfolioGallery portfolio={portfolio} />
      )}

      {/* CASE STUDIES / PAST WORKS */}
      {profile.category === "digital" && profile.pastWorks?.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Past Works</h2>

          <div className="space-y-4">
            {profile.pastWorks.map((work: any, i: number) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex justify-between">
                  <h3 className="font-semibold">{work.title}</h3>
                  {work.year && (
                    <span className="text-sm text-slate-400">{work.year}</span>
                  )}
                </div>

                <p className="mt-2 text-slate-600">{work.description}</p>

                {work.link && (
                  <a
                    href={work.link}
                    target="_blank"
                    className="text-blue-600 text-sm font-semibold mt-2 inline-block"
                  >
                    View Project →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
