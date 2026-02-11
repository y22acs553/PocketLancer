"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Loader2, UploadCloud, Shield, User2 } from "lucide-react";

export default function ClientProfilePage() {
  const [user, setUser] = useState<any>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [current, setCurrent] = useState("");
  const [nextPass, setNextPass] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // ================================
  // Load profile
  // ================================
  useEffect(() => {
    api.get("/profile").then((res) => {
      setUser(res.data);
      setName(res.data.name);
      setEmail(res.data.email);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // ================================
  // Save profile info
  // ================================
  const saveProfile = async () => {
    setLoading(true);
    try {
      await api.patch("/profile", { name, email });
      setToast("Profile updated");
    } catch {
      setToast("Failed to update profile");
    }
    setLoading(false);
  };

  // ================================
  // Change password
  // ================================
  const changePassword = async () => {
    setLoading(true);
    try {
      await api.patch("/profile/password", {
        currentPassword: current,
        newPassword: nextPass,
      });

      setCurrent("");
      setNextPass("");
      setToast("Password updated");
    } catch (e: any) {
      setToast(e.response?.data?.msg || "Failed to update password");
    }
    setLoading(false);
  };

  // ================================
  // Upload avatar
  // ================================
  const uploadAvatar = async () => {
    if (!file) return;

    const form = new FormData();
    form.append("image", file); // ✅ FIXED

    setLoading(true);
    try {
      const res = await api.post("/profile/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUser((u: any) => ({ ...u, avatar: res.data.avatar }));
      setFile(null);
      setPreview(null);
      setToast("Profile photo updated");
    } catch {
      setToast("Upload failed");
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  const avatarSrc =
    preview ||
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

  // ======================================================
  // UI
  // ======================================================
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-slate-900 px-5 py-3 text-white font-extrabold shadow-lg dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white">
          Client Profile
        </h1>
        <p className="font-bold text-slate-500">
          Manage identity, security, and personal information
        </p>
      </div>

      {/* Avatar Card */}
      <div className="rounded-3xl border bg-white dark:bg-slate-950 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <img
            src={avatarSrc}
            alt="Avatar"
            className="w-28 h-28 rounded-full object-cover border"
          />

          <div className="space-y-3">
            <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black hover:bg-slate-800 dark:bg-white dark:text-slate-900">
              <UploadCloud size={18} />
              {file ? file.name : "Choose Image"}

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
            </label>

            <button
              onClick={uploadAvatar}
              disabled={!file || loading}
              className="px-5 py-2 rounded-xl border font-black transition disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-3xl border bg-white dark:bg-slate-950 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <User2 />
          <h2 className="font-black text-xl">Account Info</h2>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border p-3 font-bold bg-transparent"
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border p-3 font-bold bg-transparent"
        />

        <button
          onClick={saveProfile}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-emerald-700"
        >
          Save Changes
        </button>
      </div>

      {/* Password Card */}
      <div className="rounded-3xl border bg-white dark:bg-slate-950 p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Shield />
          <h2 className="font-black text-xl">Security</h2>
        </div>

        <input
          type="password"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full rounded-xl border p-3 font-bold bg-transparent"
        />

        <input
          type="password"
          placeholder="New password"
          value={nextPass}
          onChange={(e) => setNextPass(e.target.value)}
          className="w-full rounded-xl border p-3 font-bold bg-transparent"
        />

        <button
          onClick={changePassword}
          className="bg-red-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-red-700"
        >
          Update Password
        </button>
      </div>

      {loading && (
        <div className="flex justify-center">
          <Loader2 className="animate-spin" size={30} />
        </div>
      )}
    </div>
  );
}
