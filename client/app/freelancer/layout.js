// /client/app/freelancer/layout.js

"use client";

import React from 'react';
// Import necessary Next.js components (e.g., for navigation)
import Link from 'next/link'; 

// This component defines the structure for all pages under /freelancer
const FreelancerLayout = ({ children }) => {
    // NOTE: In a real app, you would add logic here to check if the 
    // user is logged in AND if their role is 'freelancer'. 
    // If unauthorized, you would redirect them to the login page.
    
    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-gray-800 p-4 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-6">Freelancer Panel</h2>
                <nav className="space-y-3">
                    <Link href="/freelancer">
                        <p className="text-gray-300 hover:bg-gray-700 p-2 rounded block">Dashboard Home</p>
                    </Link>
                    <Link href="/freelancer/profile">
                        <p className="text-gray-300 hover:bg-gray-700 p-2 rounded block">Edit Profile</p>
                    </Link>
                    <Link href="/freelancer/availability">
                        <p className="text-gray-300 hover:bg-gray-700 p-2 rounded block">Manage Availability</p>
                    </Link>
                    <Link href="/bookings">
                        <p className="text-gray-300 hover:bg-gray-700 p-2 rounded block">View Bookings</p>
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

export default FreelancerLayout;