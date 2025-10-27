"use client";

import Link from "next/link";
import { useUser } from "@/context/UserContext";

export default function Navbar() {
  const { user, loading } = useUser();

  if (loading) return null; // wait for session check

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow">
      <h1 className="text-xl font-bold text-green-700">PocketLancer</h1>

      <div className="space-x-4">
        {!user ? (
          <>
            <Link href="/login" className="text-gray-700 hover:text-green-600">
              Login
            </Link>
            <Link href="/register" className="text-gray-700 hover:text-green-600">
              Register
            </Link>
          </>
        ) : (
          <>
            <Link href="/account" className="text-gray-700 hover:text-green-600">
              My Account
            </Link>
            <Link href="/auth/logout" className="text-gray-700 hover:text-red-600">
              Logout
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}