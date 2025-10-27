// /client/app/search/page.js

"use client";
import React, { useState, useEffect } from "react";
import api from "../../services/api";

function SearchPage() {
  const [userLocation, setUserLocation] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [skills, setSkills] = useState("");

  // 🧭 Get user's current location automatically
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, long: longitude });
          console.log("📍 Client location captured:", latitude, longitude);
        },
        (err) => {
          console.warn("⚠️ Location permission denied:", err);
          setError("Unable to get location. Using default city Hyderabad.");
          setUserLocation({ lat: 17.38, long: 78.47 });
        }
      );
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!userLocation) {
      setError("Waiting for location detection...");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const query = `/freelancers/search?lat=${userLocation.lat}&long=${userLocation.long}&skills=${skills}`;
      const response = await api.get(query);
      setResults(response.data.data);
    } catch (err) {
      console.error("Search API Error:", err);
      setError(err.response?.data?.msg || "Search failed. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Find Nearby Freelancers 📍</h1>

      <form onSubmit={handleSearch} className="mb-8 p-6 bg-gray-100 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700">Skill Keywords</label>
          <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g., plumbing, electrician" className="mt-1 block w-full border border-gray-300 p-2 rounded-md" />
        </div>

        <button type="submit" disabled={loading} className="mt-6 w-full py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-red-500">{error}</p>}

      <h2 className="text-2xl font-semibold mb-4">Results ({results.length})</h2>
      {results.map((f) => (
        <div key={f._id} className="p-4 mb-3 border border-gray-300 rounded-lg bg-white shadow-sm">
          <h3 className="text-xl font-bold">{f.name}</h3>
          <p className="text-gray-700">Skills: {f.skills.join(", ")}</p>
          <p className="text-gray-600">{f.distance ? `${(f.distance / 1000).toFixed(1)} km away` : ""}</p>
        </div>
      ))}
    </div>
  );
}

export default SearchPage;