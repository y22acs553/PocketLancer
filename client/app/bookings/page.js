// /client/app/bookings/page.js

"use client"; // Client Component for fetching and interactive display

import React, { useState, useEffect } from 'react';
import api from '@/services/api'; 
import { useRouter } from 'next/navigation';

function MyBookingsPage() {
    const router = useRouter();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null); // To display contextual messages

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                // Hitting the protected endpoint: /api/bookings/mybookings
                const response = await api.get('/bookings/mybookings');
                
                setBookings(response.data.data);
                
                // Determine the user role based on the data structure (e.g., if you have a role property in state)
                // Since the token has the role, you might extract it here from state/context if available, 
                // or assume the data structure will tell you who you are viewing.
                // For demonstration, we'll assume a helper function can get the role post-login:
                // setUserRole(getUserRoleFromContext());

            } catch (err) {
                console.error("Bookings API Error:", err);
                
                // If 401/403, redirect to login
                if (err.response?.status === 401 || err.response?.status === 403) {
                    alert("Session expired or access denied. Please log in.");
                    router.push('/login');
                } else {
                    setError("Failed to retrieve bookings. Server error.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [router]);

    // Simple helper to get the title based on the assumed role
    const getPageTitle = () => {
        // In a real app, you would use req.role from a context provider
        if (userRole === 'freelancer') return "Incoming Service Requests";
        if (userRole === 'client') return "My Scheduled Appointments";
        return "My Bookings";
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">{getPageTitle()}</h1>
            
            {loading && <p className="text-blue-500">Loading appointments...</p>}
            {error && <p className="text-red-500">{error}</p>}
            
            {(!loading && bookings.length === 0) && (
                <p className="text-gray-500">You have no active appointments or requests.</p>
            )}

            <div className="space-y-6">
                {bookings.map(booking => (
                    <div key={booking._id} className="p-5 border border-gray-300 rounded-lg shadow-sm bg-white">
                        <p className="text-xl font-semibold mb-2">Service: {booking.service_details}</p>
                        
                        <div className="text-sm text-gray-700">
                            <p><strong>Date & Time:</strong> {new Date(booking.date_time).toLocaleString()}</p>
                            <p><strong>Status:</strong> <span className={`font-bold ${booking.status === 'Confirmed' ? 'text-green-600' : 'text-yellow-600'}`}>{booking.status}</span></p>
                            <p><strong>Payment:</strong> {booking.payment_status}</p>
                            
                            {/* Display opposite party details */}
                            <p className="mt-2">
                                <strong>{userRole === 'freelancer' ? 'Client' : 'Freelancer'}:</strong> 
                                {userRole === 'freelancer' 
                                    ? booking.client_id.name // Show client name if logged in as freelancer
                                    : booking.freelancer_id.name} {/* Show freelancer name if logged in as client */}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MyBookingsPage;