"use client";

import React, { useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, Briefcase, UserCircle, Loader2, ChevronRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // 1. State Management
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "client" as "client" | "freelancer",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 2. Input Handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Industry Standard: This one request creates the User AND the initial Profile
      const res = await api.post("/auth/register", formData);

      if (res.data.success) {
        // Redirect to login so they can verify via OTP
        router.push("/login?message=registered_successfully");
      }
    } catch (err: any) {
      setError(err.response?.data?.msg || "Registration failed. Try a different email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[90vh] bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg p-8 bg-white shadow-2xl rounded-3xl border border-slate-100">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Join PocketLancer</h1>
          <p className="text-slate-500 mt-3 text-lg">Create your account to get started.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg mb-8 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Selection Tabs */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: "client" })}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.role === "client"
                ? "border-brand-primary bg-blue-50 text-brand-primary"
                : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                }`}
            >
              <UserCircle size={20} />
              <span className="font-bold">I'm a Client</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: "freelancer" })}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${formData.role === "freelancer"
                ? "border-brand-primary bg-blue-50 text-brand-primary"
                : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                }`}
            >
              <Briefcase size={20} />
              <span className="font-bold">I'm a Freelancer</span>
            </button>
          </div>

          <div className="relative">
            <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-slate-900"
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-slate-900"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="password"
              name="password"
              placeholder="Create Password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-slate-900"
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all flex justify-center items-center gap-3 shadow-lg shadow-slate-200"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : "Create Account"}
            {!loading && <ChevronRight size={20} />}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-primary font-bold hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}