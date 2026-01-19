"use client";

import { useState } from "react";
import api from "@/services/api";
import { useUser } from "@/context/UserContext";
import { Wrench, Plus, Check } from "lucide-react";

export default function FreelancerDashboard() {
  const { user } = useUser();
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [bio, setBio] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const addSkill = () => {
    if (currentSkill && !skills.includes(currentSkill)) {
      setSkills([...skills, currentSkill]);
      setCurrentSkill("");
    }
  };

  const handleProfileSubmit = async () => {
    setIsUpdating(true);

    // 1. Get real location from browser
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude]; // [Long, Lat]

        try {
          await api.put("/freelancers/update-profile", {
            skills,
            bio,
            location: {
              type: "Point",
              coordinates: coords,
            },
          });
          alert("Profile updated with your real location!");
          window.location.reload();
        } catch (err) {
          alert("Update failed");
        } finally {
          setIsUpdating(false);
        }
      },
      (err) => {
        alert("Please allow location access to be searchable!");
        setIsUpdating(false);
      },
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Freelancer Dashboard</h1>

      {/* 🚀 PROFILE COMPLETION CARD */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Wrench size={24} />
          </div>
          <h2 className="text-xl font-bold">
            Complete Your Professional Profile
          </h2>
        </div>

        <p className="text-slate-500 mb-6">
          Clients can't find you until you list your skills.
        </p>

        <div className="space-y-6">
          {/* Skills Input */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              My Skills
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentSkill}
                onChange={(e) => setCurrentSkill(e.target.value)}
                placeholder="e.g. Plumbing, UI Design"
                className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addSkill}
                className="bg-slate-900 text-white p-2 rounded-lg"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Bio Input */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Short Bio
            </label>
            <textarea
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell clients about your experience..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <button
            onClick={handleProfileSubmit}
            disabled={isUpdating || skills.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-slate-300"
          >
            {isUpdating ? "Saving..." : "Make me Searchable"}
          </button>
        </div>
      </div>
    </div>
  );
}
