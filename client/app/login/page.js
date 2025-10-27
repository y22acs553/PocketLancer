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

  // State for OTP verification
  const [otpData, setOtpData] = useState({
    email: "",
    role: "",
    otp: "",
  });

  const [step, setStep] = useState("login"); // 'login' or 'otp'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // -----------------------------------------------------------
  // 🔄 AUTO SESSION CHECK ON PAGE LOAD
  // -----------------------------------------------------------
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get("/auth/check-session");
        if (res.data.loggedIn) {
          router.push(res.data.role === "freelancer" ? "/freelancer" : "/client");
        }
      } catch {
        console.log("No active session or session expired.");
      }
    };
    checkSession();
  }, [router]);

  // -----------------------------------------------------------
  // 🟡 LOGIN STEP → Validate password + send OTP
  // -----------------------------------------------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage("");

    try {
      console.log("🟢 Sending login request:", loginData);
      const res = await api.post("/auth/login", loginData);

      if (res.data.success) {
        setMessage(res.data.msg || "OTP sent to your email.");
        setOtpData({
          email: loginData.email,
          role: loginData.role,
          otp: "",
        });
        setStep("otp");
      }
    } catch (err) {
      console.error("❌ Login Error:", err);
      setError(err.response?.data?.msg || "Invalid credentials or server error.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // 🔵 OTP VERIFY STEP → Confirm OTP + login user
  // -----------------------------------------------------------
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage("");

    try {
      console.log("🟢 Verifying OTP:", otpData);
      const res = await api.post("/auth/verify-otp", otpData);

      if (res.data.success) {
        alert("✅ Login successful!");
        router.push(otpData.role === "freelancer" ? "/freelancer" : "/client");
      } else {
        setError(res.data.msg || "OTP verification failed.");
      }
    } catch (err) {
      console.error("❌ OTP Verify Error:", err);
      setError(err.response?.data?.msg || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // 🧩 FORM HANDLERS
  // -----------------------------------------------------------
  const handleLoginChange = (e) =>
    setLoginData({ ...loginData, [e.target.name]: e.target.value });

  const handleOtpChange = (e) =>
    setOtpData({ ...otpData, [e.target.name]: e.target.value });

  // -----------------------------------------------------------
  // 🧠 FORM RENDERERS
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
        {loading ? "Sending OTP..." : "Login"}
      </button>
    </form>
  );

  const renderOtpForm = () => (
    <form onSubmit={handleOtpSubmit} className="space-y-4">
      <p className="text-sm text-yellow-600">
        Enter the 6-digit OTP sent to your registered email.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700">OTP</label>
        <input
          type="text"
          name="otp"
          value={otpData.otp}
          onChange={handleOtpChange}
          required
          maxLength={6}
          className="w-full border border-gray-300 p-2 rounded-md text-center tracking-widest"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Verifying OTP..." : "Verify & Login"}
      </button>

      <button
        type="button"
        onClick={() => {
          setStep("login");
          setMessage("");
          setError(null);
        }}
        className="w-full mt-2 py-2 text-sm text-gray-600 hover:text-red-500"
      >
        Cancel / Back to Login
      </button>
    </form>
  );

  // -----------------------------------------------------------
  // 🧭 RENDER
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
        {message && (
          <p className="text-green-600 bg-green-50 p-3 rounded mb-4 text-sm">
            {message}
          </p>
        )}

        {step === "login" ? renderLoginForm() : renderOtpForm()}
      </div>
    </div>
  );
}

export default LoginPage;