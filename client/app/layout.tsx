// ==========================================================
// ✅ 1️⃣ Declare this as a Client Component
// ----------------------------------------------------------
// The "use client" directive must be at the very top.
// This ensures React hooks like useState/useContext can be used here.
"use client";

// ==========================================================
// ✅ 2️⃣ Import Dependencies
// ----------------------------------------------------------
// - React for JSX + hooks
// - Link from Next.js for navigation
// - Global CSS styling
// - UserProvider + UserContext for session management
// ==========================================================
import React, { useContext } from "react";
import Link from "next/link";
import "./globals.css";
import { UserProvider, UserContext } from "@/context/UserContext";


// ==========================================================
// ✅ 3️⃣ HEADER COMPONENT
// ----------------------------------------------------------
// This component displays navigation links + authentication buttons.
// It reacts to login state from UserContext.
// ==========================================================
const Header = () => {
  // 🔍 Access user session data and logout function from global context
  const context = useContext(UserContext);
  const user = context?.user;
  const logout = context?.logout;

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">

        {/* 🪶 Brand / Logo */}
        <Link href="/">
          <p className="text-3xl font-extrabold text-blue-600 hover:text-blue-700 transition">
            PocketLancer
          </p>
        </Link>

        {/* 🧭 Navigation Links (Visible on Desktop) */}
        <nav className="hidden md:flex space-x-6 text-lg">
          <Link href="/">
            <p className="text-gray-700 hover:text-blue-600 transition font-medium">
              Home
            </p>
          </Link>
          <Link href="/search">
            <p className="text-gray-700 hover:text-blue-600 transition font-medium">
              Find Services
            </p>
          </Link>
          <Link href="/about">
            <p className="text-gray-700 hover:text-blue-600 transition font-medium">
              About Us
            </p>
          </Link>
          <Link href="/contact">
            <p className="text-gray-700 hover:text-blue-600 transition font-medium">
              Contact Us
            </p>
          </Link>
        </nav>

        {/* 👤 Conditional Buttons (depends on login state) */}
        <div className="space-x-4">
          {/* ✅ If logged in → show My Account + Logout */}
          {user ? (
            <>
              {/* "My Account" redirects to either Freelancer or Client Dashboard */}
              <Link
                href={user.role === "freelancer" ? "/freelancer" : "/client"}
              >
                <button className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-300">
                  {/* Optional: You can make this say “Hi, {user.name} 👋” */}
                  My Account
                </button>
              </Link>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="text-red-600 border border-red-600 py-2 px-4 rounded-lg font-semibold hover:bg-red-50 transition duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            /* ❌ If not logged in → show Login + Register buttons */
            <>
              <Link href="/login">
                <button className="text-blue-600 border border-blue-600 py-2 px-4 rounded-lg font-semibold hover:bg-blue-50 transition duration-300">
                  Log In
                </button>
              </Link>
              <Link href="/register">
                <button className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-300">
                  Register
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};


// ==========================================================
// ✅ 4️⃣ FOOTER COMPONENT
// ----------------------------------------------------------
// Simple footer with navigation + copyright
// ==========================================================
const Footer = () => (
  <footer className="bg-gray-800 text-white mt-auto">
    <div className="container mx-auto px-4 py-8 text-center">
      {/* Footer navigation links */}
      <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-8 mb-6 text-sm">
        <Link href="/terms">
          <p className="hover:text-blue-400 transition">Terms of Service</p>
        </Link>
        <Link href="/privacy">
          <p className="hover:text-blue-400 transition">Privacy Policy</p>
        </Link>
        <Link href="/freelancer/availability">
          <p className="hover:text-blue-400 transition">For Freelancers</p>
        </Link>
      </div>

      {/* Copyright Section */}
      <p className="text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} PocketLancer. All rights reserved.
      </p>
    </div>
  </footer>
);


// ==========================================================
// ✅ 5️⃣ ROOT LAYOUT COMPONENT
// ----------------------------------------------------------
// Wraps the entire app with:
// - UserProvider (to manage session globally)
// - Header and Footer (persistent across all pages)
// - Main content area (`children`) in between
// ==========================================================
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-gray-50">
        {/* 🧩 Provide global user state (session, logout, etc.) */}
        <UserProvider>
          <Header />

          {/* 💡 Main Page Content */}
          <main className="flex-grow">{children}</main>

          <Footer />
        </UserProvider>
      </body>
    </html>
  );
}