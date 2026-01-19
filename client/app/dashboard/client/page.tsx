"use client";

import { useUser } from "@/context/UserContext";
import { Users, PlusCircle, Search } from "lucide-react";

export default function ClientDashboard() {
  const { user } = useUser();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Client Hub</h1>
          <p className="text-slate-500">
            Manage your hires and find new talent.
          </p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition">
          <PlusCircle size={20} /> Post a Job
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-600" /> My Freelancers
          </h2>
          <p className="text-slate-500 text-sm">
            You haven't hired anyone yet.
          </p>
          <button className="mt-4 text-blue-600 text-sm font-medium hover:underline">
            Browse Talent →
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search size={20} className="text-blue-600" /> Recent Searches
          </h2>
          <div className="space-y-3">
            {["React Developer", "UI Designer", "Node.js Expert"].map(
              (term) => (
                <div
                  key={term}
                  className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  {term}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
