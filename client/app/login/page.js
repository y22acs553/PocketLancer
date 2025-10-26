"use client";

import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";

function LoginPage() {
  const router = useRouter();

  // State for login form
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    role: "client",
  });

  // State for MFA form
  const [mfaData, setMfaData] = useState({
    userId: null,
    role: null,
    mfaCode: "",
  });

  const [step, setStep] = useState("login"); // 'login' or 'mfa'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // -----------------------------------------------------------
  // 🟢 HANDLERS
  // -----------------------------------------------------------
  const handleLoginChange = (e) =>
    setLoginData({ ...loginData, [e.target.name]: e.target.value });

  const handleMfaChange = (e) =>
    setMfaData({ ...mfaData, [e.target.name]: e.target.value });

  // -----------------------------------------------------------
  // 🔄 AUTO SESSION CHECK ON PAGE LOAD
  // -----------------------------------------------------------
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get("/auth/check-session"); // implement this route on server
        if (res.data.loggedIn) {
          // If user already has a valid session, redirect to dashboard
          router.push(res.data.role === "freelancer" ? "/freelancer" : "/client");
        }
      } catch (err) {
        console.log("No active session or session expired.");
      }
    };
    checkSession();
  }, [router]);

  // -----------------------------------------------------------
  // 🟡 LOGIN: Step 1 (Password check + MFA initiate)
  // -----------------------------------------------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log("🟢 [FRONTEND] Login request payload:", loginData);

    try {
      const response = await api.post("/auth/login", loginData);
      const { userId, role, msg, mfa_verification_code_simulated } =
        response.data;

      console.log("✅ [FRONTEND] Login success:", response.data);

      setMfaData({
        userId,
        role: loginData.role,
        mfaCode: "",
      });

      setStep("mfa");
      alert(`${msg}\nSimulated MFA code: ${mfa_verification_code_simulated}`);
    } catch (err) {
      console.error("❌ [FRONTEND] Login Error:", err);
      setError(err.response?.data?.msg || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // 🔵 MFA VERIFY: Step 2 (Code check + JWT issue)
  // -----------------------------------------------------------
  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log("🟢 [FRONTEND] MFA verification data:", mfaData);

    try {
      const { userId, role, mfaCode } = mfaData;

      if (!userId || !role || !mfaCode) {
        console.warn("⚠️ Missing MFA fields before sending:", mfaData);
        throw new Error("Missing MFA fields.");
      }

      const response = await api.post("/auth/verify-mfa", {
        userId,
        role,
        mfa_code: mfaCode,
      });

      console.log("✅ [FRONTEND] MFA verification success:", response.data);

      alert("Login successful! Redirecting...");

      router.push(response.data.role === "freelancer" ? "/freelancer" : "/client");
    } catch (err) {
      console.error("❌ [FRONTEND] MFA Error:", err);
      setError(err.response?.data?.msg || "MFA verification failed.");
      setStep("login");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // 🧩 FORM RENDERING
  // -----------------------------------------------------------
  const renderLoginForm = () => (
    <form onSubmit={handleLoginSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          name="email"
          value={loginData.email}
          onChange={handleLoginChange}
          required
          className="w-full border border-gray-300 p-2 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          name="password"
          value={loginData.password}
          onChange={handleLoginChange}
          required
          className="w-full border border-gray-300 p-2 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Login Role</label>
        <select
          name="role"
          value={loginData.role}
          onChange={handleLoginChange}
          required
          className="w-full border border-gray-300 p-2 rounded-md"
        >
          <option value="client">Client</option>
          <option value="freelancer">Freelancer</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
      >
        {loading ? "Verifying..." : "Log In"}
      </button>
    </form>
  );

  const renderMfaForm = () => (
    <form onSubmit={handleMfaSubmit} className="space-y-4">
      <p className="text-sm text-yellow-600">
        MFA Required: Enter the 6-digit code sent to your email/SMS.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700">MFA Code</label>
        <input
          type="text"
          name="mfaCode"
          value={mfaData.mfaCode}
          onChange={handleMfaChange}
          required
          className="w-full border border-gray-300 p-2 rounded-md"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Verifying Code..." : "Verify Code"}
      </button>

      <button
        type="button"
        onClick={() => setStep("login")}
        className="w-full mt-2 py-2 text-sm text-gray-600 hover:text-red-500"
      >
        Cancel / Back to Login
      </button>
    </form>
  );

  // -----------------------------------------------------------
  // 🧠 RETURN JSX
  // -----------------------------------------------------------
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
          PocketLancer Login
        </h1>

        {error && (
          <p className="text-red-500 bg-red-100 p-3 rounded mb-4 text-sm">
            {error}
          </p>
        )}

        {step === "login" ? renderLoginForm() : renderMfaForm()}
      </div>
    </div>
  );
}

export default LoginPage;