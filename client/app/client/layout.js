// /client/app/client/layout.js

"use client";

import React from 'react';
import Link from 'next/link'; 

// This component defines the structure for all pages under /client
const ClientLayout = ({ children }) => {
    // NOTE: In a real app, logic would go here to ensure the user is 
    // logged in AND their role is 'client'. Unauthorized users would be redirected.

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-teal-800 p-4 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-6">Client Portal</h2>
                <nav className="space-y-3">
                    <Link href="/client">
                        <p className="text-teal-200 hover:bg-teal-700 p-2 rounded block">Dashboard Home</p>
                    </Link>
                    <Link href="/search">
                        <p className="text-teal-200 hover:bg-teal-700 p-2 rounded block">Find Services</p>
                    </Link>
                    <Link href="/bookings">
                        <p className="text-teal-200 hover:bg-teal-700 p-2 rounded block">My Appointments</p>
                    </Link>
                    <Link href="/client/profile">
                        <p className="text-teal-200 hover:bg-teal-700 p-2 rounded block">Edit Profile</p>
                    </Link>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-8">
                {children} {/* Renders the content of nested pages (page.js, profile/page.js, etc.) */}
            </main>
        </div>
    );
};

export default ClientLayout;