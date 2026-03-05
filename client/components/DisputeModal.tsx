"use client";

import { useState } from "react";
import api from "@/services/api";
import { Loader2, UploadCloud, X } from "lucide-react";

export default function DisputeModal({
  bookingId,
  onClose,
}: {
  bookingId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "upload" | "done">("form");
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ===============================
  // CREATE DISPUTE
  // ===============================
  const submitDispute = async () => {
    if (!reason.trim()) {
      setError("Please explain the issue before submitting.");
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const res = await api.post("/disputes", {
        bookingId,
        reason,
      });

      setDisputeId(res.data._id || res.data.dispute?._id);
      setStep("upload");
    } catch (err: any) {
      setError(err.response?.data?.msg || "Failed to create dispute");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // UPLOAD EVIDENCE
  // ===============================
  const uploadEvidence = async () => {
    if (!file || !disputeId) {
      setStep("done");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Evidence file must be smaller than 10MB.");
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const form = new FormData();
      form.append("file", file);

      await api.post(`/disputes/${disputeId}/evidence`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStep("done");
    } catch {
      setError("Evidence upload failed");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-xl">
        {/* CLOSE BUTTON */}
        <div className="flex justify-end mb-2">
          <button onClick={onClose}>
            <X className="opacity-60 hover:opacity-100" />
          </button>
        </div>

        {/* ================= FORM STEP ================= */}
        {step === "form" && (
          <>
            <h2 className="text-2xl font-black mb-4 text-slate-900 dark:text-white">
              Raise Dispute
            </h2>

            {/* REASON */}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="Explain the issue clearly..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700
                         bg-white dark:bg-slate-950
                         p-4 font-bold outline-none mb-4"
            />

            {/* FILE UPLOAD */}
            <div className="mb-5">
              <input
                id="fileUpload"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />

              <label
                htmlFor="fileUpload"
                className="inline-flex items-center gap-3 cursor-pointer
                           rounded-xl bg-slate-900 text-white
                           px-5 py-3 font-black
                           hover:bg-slate-800 transition"
              >
                <UploadCloud size={18} />
                Upload Evidence
              </label>

              {file && (
                <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  Selected: {file.name}
                </p>
              )}
            </div>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border font-bold"
              >
                Cancel
              </button>

              <button
                onClick={submitDispute}
                disabled={loading}
                className="px-6 py-2 rounded-xl bg-red-600 text-white font-black flex items-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                Raise Dispute
              </button>
            </div>
          </>
        )}

        {/* ================= UPLOAD STEP ================= */}
        {step === "upload" && (
          <>
            <h2 className="text-xl font-black mb-5">Upload Evidence</h2>

            <button
              onClick={uploadEvidence}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              Upload & Finish
            </button>
          </>
        )}

        {/* ================= DONE STEP ================= */}
        {step === "done" && (
          <>
            <h2 className="text-xl font-black text-green-600 mb-4">
              Dispute Submitted Successfully
            </h2>

            <button
              onClick={onClose}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black"
            >
              Close
            </button>
          </>
        )}

        {/* ERROR */}
        {error && (
          <p className="text-red-500 font-bold mt-4 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}
