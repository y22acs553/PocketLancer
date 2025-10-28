"use client";

import React, { useState } from "react";
import api from "@/services/api";
import SearchResults from "@/components/SearchResults";

export default function SearchPage() {
  const [skill, setSkill] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🧭 Get user's real-time coordinates
  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject("Geolocation not supported by your browser.");
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            long: pos.coords.longitude,
          }),
        (err) => reject("Location access denied.")
      );
    });

  // 🔍 Handle Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!skill.trim()) return alert("Please enter a skill (e.g., plumbing)");

    setLoading(true);
    try {
      const { lat, long } = await getLocation();

      const response = await api.get("/freelancers/search", {
        params: { skills: skill, lat, long },
      });

      setResults(response.data.data || []);
    } catch (err) {
      console.error("Search Error:", err);
      alert(err.response?.data?.msg || "Failed to fetch freelancers.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">
        Find Nearby Freelancers
      </h1>

      {/* 🔍 Search Bar */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col md:flex-row justify-center items-center gap-4 mb-8"
      >
        <input
          type="text"
          placeholder="Enter a skill (e.g., plumbing, electrician)"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="border border-gray-300 p-3 rounded-lg w-full md:w-1/2 shadow-sm focus:ring-2 focus:ring-blue-400"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* 📦 Render Search Results */}
      {loading ? (
        <p className="text-center text-gray-500">Searching nearby freelancers...</p>
      ) : (
        <SearchResults results={results} />
      )}
    </div>
  );
}