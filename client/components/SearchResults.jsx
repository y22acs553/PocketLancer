"use client";

import React, { useState } from "react";
import BookingModal from "@/components/BookingModal";

export default function SearchResults({ results = [] }) {
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);

  // 🧠 Close modal handler
  const handleCloseModal = () => {
    setSelectedFreelancer(null);
  };

  return (
    <div className="p-6">
      {/* 🟢 Render Search Results */}
      {Array.isArray(results) && results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((f) => (
            <div
              key={f._id}
              className="border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all bg-white flex flex-col justify-between"
            >
              {/* Freelancer Info */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-1">
                  {f.name}
                </h2>
                <p className="text-sm text-gray-600 mb-1">
                  {f.skills?.length ? f.skills.join(", ") : "No skills listed"}
                </p>
                <p className="text-sm text-gray-500 mb-1">
                  {f.city || "Unknown City"}
                </p>
                <p className="text-xs text-gray-400">
                  Distance:{" "}
                  {f.distance ? (f.distance / 1000).toFixed(1) : "0.0"} km away
                </p>
              </div>

              {/* Book Now Button */}
              <button
                onClick={() => setSelectedFreelancer(f)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition"
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center mt-6">
          No freelancers found nearby.
        </p>
      )}

      {/* 🟡 Booking Modal (opens when Book Now clicked) */}
      {selectedFreelancer && (
        <BookingModal
          freelancer={selectedFreelancer}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
