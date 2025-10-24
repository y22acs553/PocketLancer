// /client/app/freelancer/page.js

// This is a Server Component, excellent for static/initial content loading

const FreelancerDashboardPage = () => {
    return (
        <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Welcome Back!</h1>
            <p className="text-lg text-gray-600">Your central hub for managing services and clients in PocketLancer.</p>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-bold text-blue-600">Total Bookings</h3>
                    <p className="text-3xl mt-2">15</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-bold text-green-600">Next Appointment</h3>
                    <p className="text-md mt-2">Tomorrow at 10:00 AM</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-bold text-yellow-600">Unread Reviews</h3>
                    <p className="text-3xl mt-2">3</p>
                </div>
            </div>
            
            <p className="mt-8 text-sm text-gray-500">
                Use the sidebar to update your Profile, Skills, and Availability.
            </p>
        </div>
    );
};

export default FreelancerDashboardPage;