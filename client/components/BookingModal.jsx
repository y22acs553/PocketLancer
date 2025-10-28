"use client";

import { useState } from "react";
import api from "@/services/api";

export default function BookingModal({ freelancer, onClose }) {
  // --- Booking form fields ---
  const [formData, setFormData] = useState({
    serviceType: "",
    issueDescription: "",
    preferredDate: "",
    preferredTime: "",
    address: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // 🧠 Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🟢 Submit Booking
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.post("/bookings", {
        freelancer_id: freelancer._id,
        service_details: formData.serviceType,
        issue_description: formData.issueDescription,
        date_time: new Date(formData.preferredDate),
        preferred_time: formData.preferredTime,
        address: formData.address,
      });

      setMessage("✅ Booking created successfully!");
      console.log("Booking Response:", response.data);

      // Auto-close modal after a short delay
      setTimeout(() => {
        setLoading(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("❌ Booking Error:", err);
      setError(err.response?.data?.msg || "Failed to create booking.");
    } finally {
      setLoading(false);
    }
  };

  // Close modal when background overlay clicked
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-4">
          Book {freelancer.name}
        </h2>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Service Type
            </label>
            <input
              type="text"
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              placeholder="e.g., Plumbing, AC Repair"
              className="w-full border border-gray-300 p-2 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Issue Description
            </label>
            <textarea
              name="issueDescription"
              value={formData.issueDescription}
              onChange={handleChange}
              placeholder="Describe your issue briefly"
              rows={3}
              className="w-full border border-gray-300 p-2 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Preferred Date
            </label>
            <input
              type="date"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Preferred Time
            </label>
            <select
              name="preferredTime"
              value={formData.preferredTime}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-md"
              required
            >
              <option value="">Select Time Slot</option>
              <option>Morning (8am–12pm)</option>
              <option>Afternoon (12pm–4pm)</option>
              <option>Evening (4pm–8pm)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Service Address
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter service location"
              className="w-full border border-gray-300 p-2 rounded-md"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-between mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-400 text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Booking..." : "Confirm Booking"}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {message && <p className="text-green-600 text-sm mt-2">{message}</p>}
        </form>
      </div>
    </div>
  );
}
