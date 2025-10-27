// /client/app/register/page.js

"use client";

import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Helper: Convert city name to coordinates using OpenStreetMap (free API)
async function getCoordinatesFromCity(cityName) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`
    );
    const data = await res.json();

    if (data && data.length > 0) {
      const { lon, lat } = data[0];
      console.log(`📍 Geocoded "${cityName}" →`, lon, lat);
      return { lon: parseFloat(lon), lat: parseFloat(lat) };
    } else {
      console.warn(`⚠️ No coordinates found for ${cityName}. Using fallback Hyderabad.`);
      return { lon: 78.47, lat: 17.38 }; // fallback: Hyderabad
    }
  } catch (err) {
    console.error("❌ Error fetching coordinates:", err);
    return { lon: 78.47, lat: 17.38 };
  }
}

function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "client",
    skills: "",
    city: "",
    location: null,
  });

  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Capture GPS automatically for freelancers (optional)
  /*useEffect(() => {
    if (formData.role === "freelancer" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          console.log("📡 Browser GPS location:", latitude, longitude);
          setFormData((prev) => ({
            ...prev,
            location: { type: "Point", coordinates: [longitude, latitude] },
          }));
        },
        (err) => {
          console.warn("⚠️ Location access denied:", err);
          // do nothing, we'll geocode city later
        },
        { enableHighAccuracy: true }
      );
    }
  }, [formData.role]);*/

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const endpoint = `/auth/register/${formData.role}`;
    let finalLocation = formData.location;

    // If freelancer and no GPS location, geocode city name
    if (formData.role === "freelancer" && !finalLocation?.coordinates && formData.city) {
      const { lon, lat } = await getCoordinatesFromCity(formData.city);
      finalLocation = { type: "Point", coordinates: [lon, lat] };
    }

    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      ...(formData.role === "freelancer" && {
        city: formData.city || "Hyderabad",
        skills: formData.skills
          ? formData.skills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        location:
          finalLocation || { type: "Point", coordinates: [78.47, 17.38] }, // fallback Hyderabad
      }),
    };

    console.log("📦 Payload sent →", JSON.stringify(payload, null, 2));

    try {
      const response = await api.post(endpoint, payload);
      setSuccessMsg(response.data.msg || "Registration successful!");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      console.error("❌ Registration Error:", err);
      setError(err.response?.data?.msg || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-lg p-8 bg-white shadow-xl rounded-xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          Join PocketLancer
        </h1>

        {error && (
          <p className="text-red-500 bg-red-100 p-3 rounded mb-4 text-sm">{error}</p>
        )}
        {successMsg && (
          <p className="text-green-600 bg-green-100 p-3 rounded mb-4 text-sm">
            {successMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              I want to register as:
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md"
            >
              <option value="client">Client (Need Services)</option>
              <option value="freelancer">Freelancer (Offer Services)</option>
            </select>
          </div>

          {/* Common Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-md"
            />
          </div>

          {/* Freelancer Fields */}
          {formData.role === "freelancer" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City / Town
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g., Hyderabad, Bapatla"
                  className="w-full border border-gray-300 p-2 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Type your city name (will auto-detect coordinates).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g., plumbing, electrician"
                  className="w-full border border-gray-300 p-2 rounded-md"
                />
              </div>

              {formData.city && formData.location?.coordinates && (
                <p className="text-xs text-gray-600 mt-2">
                  Coordinates detected:{" "}
                  {formData.location.coordinates.join(", ")}
                </p>
              )}
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md shadow-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Processing..." : "Register Account"}
          </button>

          <p className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Log in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;