// client/app/page.tsx (or page.js)

"use client";

import React from "react";
import Link from "next/link";

const HomePage = () => {
  // NOTE: Session check logic removed for simplicity here, as the Layout handles auth buttons.
  // If logged in, you can still redirect them immediately inside a useEffect hook.

  return (
    <div className="p-4 md:p-12">
      {/* 1. Hero Section: Core Value Proposition */}
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-100 rounded-2xl shadow-xl">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 max-w-4xl">
          Connect with{" "}
          <span className="text-blue-600">Local Service Experts</span> Today
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-3xl">
          Find skilled, nearby freelancers for services requiring an on-site
          presence, all secured with JWT and Multi-Factor Authentication.
        </p>

        {/* Primary CTA Button */}
        <Link href="/search">
          <button className="bg-blue-600 text-white py-4 px-10 rounded-full text-xl font-bold hover:bg-blue-700 transition duration-300 shadow-lg">
            Start Your Search Now →
          </button>
        </Link>
      </div>

      {/* 2. Feature Section: Why PocketLancer? */}
      <div className="mt-16 text-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-10">
          Features Built for Trust and Locality
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1: Location */}
          <div className="p-6 bg-white rounded-xl shadow-lg border-t-4 border-blue-500">
            <h3 className="text-2xl font-semibold text-blue-600 mb-3">
              Geo-Based Matching
            </h3>
            <p className="text-gray-600">
              Find professionals who are actually close to you, minimizing
              travel time and hassle.{" "}
            </p>
          </div>

          {/* Feature 2: Security */}
          <div className="p-6 bg-white rounded-xl shadow-lg border-t-4 border-blue-500">
            <h3 className="text-2xl font-semibold text-blue-600 mb-3">
              Secure MFA Login
            </h3>
            <p className="text-gray-600">
              Authentication protected by JWT and Multi-Factor Authentication
              (MFA) for maximum data safety.
            </p>
          </div>

          {/* Feature 3: Booking */}
          <div className="p-6 bg-white rounded-xl shadow-lg border-t-4 border-blue-500">
            <h3 className="text-2xl font-semibold text-blue-600 mb-3">
              Real-Time Booking
            </h3>
            <p className="text-gray-600">
              View freelancer availability with a built-in calendar and book
              services instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
