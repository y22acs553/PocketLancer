// /client/app/client/page.js

// This is a Server Component, ideal for initial static content

const ClientDashboardPage = () => {
    return (
        <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Welcome to Your Client Hub!</h1>
            <p className="text-lg text-gray-600">Quickly track the status of your services and manage your profile.</p>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-bold text-blue-600">Open Bookings</h3>
                    <p className="text-3xl mt-2">2</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-bold text-green-600">Services Completed</h3>
                    <p className="text-3xl mt-2">7</p>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h3 className="text-xl font-bold text-yellow-600">Pending Payments</h3>
                    <p className="text-3xl mt-2">1</p>
                </div>
            </div>
            
            <p className="mt-8 text-sm text-gray-500">
                Use the "Find Services" link in the sidebar to search for local help.
            </p>
        </div>
    );
};

export default ClientDashboardPage;