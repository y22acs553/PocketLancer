"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

export default function ClientLayout({ children }) {
    const router = useRouter();

    useEffect(() => {
        const checkRole = async () => {
            const res = await api.get("/auth/check-session");
            if (res.data.role !== "client") {
                router.replace("/switch-role");
            }
        };
        checkRole();
    }, []);

    return (
        <div>
            <nav className="p-4 bg-blue-600 text-white">
                <span>Client Dashboard</span>
                <button
                    className="ml-4 underline"
                    onClick={() => router.push("/switch-role")}
                >
                    Switch Role
                </button>
            </nav>

            <main className="p-6">{children}</main>
        </div>
    );
}