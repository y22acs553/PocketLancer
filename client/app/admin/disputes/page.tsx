"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

export default function AdminDisputes() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/disputes")
      .then((res) => setList(res.data))
      .finally(() => setLoading(false));
  }, []);

  const resolve = async (id: string, resolution: string) => {
    await api.patch(`/disputes/${id}/resolve`, {
      resolution,
      adminNotes: "Resolved by admin",
    });

    setList((l) => l.filter((d) => d._id !== id));
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-black">Disputes</h1>

      {list.map((d) => (
        <div key={d._id} className="border rounded-xl p-5">
          <p className="font-bold">Booking: {d.bookingId?._id}</p>

          <p className="text-sm mb-2">Reason: {d.reason}</p>

          <div className="flex gap-2 flex-wrap">
            {d.evidence.map((e: any, i: number) => (
              <a
                key={i}
                href={e.url}
                target="_blank"
                className="underline text-blue-600"
              >
                Evidence {i + 1}
              </a>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => resolve(d._id, "refund_to_client")}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Refund Client
            </button>

            <button
              onClick={() => resolve(d._id, "release_to_freelancer")}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Pay Freelancer
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
