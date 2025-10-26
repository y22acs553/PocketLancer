// /client/app/search/page.js

"use client"; // Marks this component as a Client Component for interactivity

import React, { useState } from 'react';
// FIX: Using relative path to access the services folder outside of the app directory
import api from '../../services/api'; 

function SearchPage() {
    // State to hold search criteria and results
    const [searchParams, setSearchParams] = useState({
        long: '78.47', // Default to Hyderabad longitude
        lat: '17.38',  // Default to Hyderabad latitude
        maxDist: '50', // Default search radius in KM
        skills: ''     // Skills filter (e.g., 'Plumbing, Electrical')
    });
    const handleBook = async (freelancerId) => {
  try {
    const response = await api.post("/bookings", {
      freelancer_id: freelancerId,
      service_details: "Electrical Repair at Home",
      date_time: new Date()
    });
    alert("Booking created successfully!");
  } catch (err) {
    console.error("Booking Error:", err);
    alert("Failed to create booking. Make sure you are logged in as a client.");
  }
};
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Handler for input changes
    const handleChange = (e) => {
        setSearchParams({
            ...searchParams,
            [e.target.name]: e.target.value,
        });
    };

    // Handler for form submission and API call
    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            // Construct the query string from state
            const queryString = `/freelancers/search?long=${searchParams.long}&lat=${searchParams.lat}&maxDist=${searchParams.maxDist}&skills=${searchParams.skills}`;
            
            // Make the GET request using your configured Axios client
            const response = await api.get(queryString);
            
            // Update the results state
            setResults(response.data.data); 

        } catch (err) {
            console.error("Search API Error:", err);
            // Assuming 400 response from backend is user error (e.g., missing data)
            setError(err.response?.data?.msg || "Failed to fetch freelancers. Please check the coordinates and server status.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Find Local Freelancers 📍</h1>
            
            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-8 p-6 bg-gray-100 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    
                    {/* Longitude Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Longitude (e.g., 78.47)</label>
                        <input type="text" name="long" value={searchParams.long} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 p-2 rounded-md" />
                    </div>

                    {/* Latitude Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Latitude (e.g., 17.38)</label>
                        <input type="text" name="lat" value={searchParams.lat} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 p-2 rounded-md" />
                    </div>
                    
                    {/* Max Distance Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Max Distance (KM)</label>
                        <input type="number" name="maxDist" value={searchParams.maxDist} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 p-2 rounded-md" />
                    </div>

                    {/* Skills Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Skills (e.g., plumbing, electric)</label>
                        <input type="text" name="skills" value={searchParams.skills} onChange={handleChange} className="mt-1 block w-full border border-gray-300 p-2 rounded-md" />
                    </div>
                </div>
                
                <button type="submit" disabled={loading} className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                    {loading ? 'Searching...' : 'Search PocketLancer'}
                </button>
            </form>

            {/* Display Results */}
            {error && <p className="text-red-500 mb-4">{error}</p>}

            <h2 className="text-2xl font-semibold mb-4">Results ({results.length})</h2>

            {results.length === 0 && !loading && !error && (
                <p className="text-gray-500">No freelancers found. Try expanding the search radius or changing skills.</p>
            )}

            <div className="space-y-4">
                {results.map(freelancer => (
                    <div key={freelancer._id} className="p-4 border border-gray-300 rounded-lg shadow-sm bg-white">
                        <h3 className="text-xl font-bold">{freelancer.name}</h3>
                        <p className="text-gray-600">Email: {freelancer.email}</p>
                        <p className="text-gray-600">Location: [{freelancer.location.coordinates.join(', ')}]</p>
                        <p className="text-gray-800 font-medium">Skills: {freelancer.skills.join(', ') || 'N/A'}</p>
                        <button className="mt-2 text-sm text-blue-500 hover:underline">View Profile</button>
                        <button
  onClick={() => handleBook(freelancer._id)}
  className="mt-2 ml-4 text-sm text-green-600 hover:underline"
>
  Book Now
</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SearchPage;