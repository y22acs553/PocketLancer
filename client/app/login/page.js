// /client/app/login/page.js

"use client"; // Client Component for interactive forms

import React, { useState } from 'react';
import api from '@/services/api'; // Import your custom configured Axios client
import { useRouter } from 'next/navigation'; // For redirection

function LoginPage() {
    const router = useRouter();
    const [loginData, setLoginData] = useState({
        email: '',
        password: '',
        role: 'client' // Default role for login select
    });
    const [mfaData, setMfaData] = useState({
        userId: null,
        role: null,
        mfaCode: '',
    });
    const [step, setStep] = useState('login'); // 'login' or 'mfa'
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- Handlers ---

    // Handles form input changes for the login form
    const handleLoginChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    // Handles MFA code input
    const handleMfaChange = (e) => {
        setMfaData({ ...mfaData, [e.target.name]: e.target.value });
    };

    // --- API Calls ---

    // Stage 1: Initial Login (Password Check & MFA Initiate)
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const response = await api.post('/auth/login', loginData);
            
            // Success: MFA initiated (server returned 200 OK)
            const { userId, role, msg } = response.data;
            
            setMfaData({ userId, role, mfaCode: '' });
            setStep('mfa'); // Move to the MFA verification screen
            alert(msg); // Show the alert with the simulated MFA code message

        } catch (err) {
            console.error("Login Error:", err);
            setError(err.response?.data?.msg || 'Login failed. Check credentials.');
        } finally {
            setLoading(false);
        }
    };

    // Stage 2: MFA Verification and Final JWT Token Issuance
    const handleMfaSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            // Data needed for verification: userId, role, mfaCode
            const { userId, role, mfaCode } = mfaData;
            
            const response = await api.post('/auth/verify-mfa', {
                userId,
                role,
                mfa_code: mfaCode,
            });

            // Success: JWT Cookie is now set on the browser automatically
            alert("Login successful! Redirecting to dashboard.");
            
            // Redirect based on the user's role
            if (response.data.role === 'freelancer') {
                router.push('/freelancer');
            } else {
                router.push('/client');
            }

        } catch (err) {
            console.error("MFA Error:", err);
            setError(err.response?.data?.msg || 'MFA verification failed.');
            setStep('login'); // Optionally revert to login step on failure
        } finally {
            setLoading(false);
        }
    };

    // --- Render Logic ---

    // Renders the initial Email/Password form
    const renderLoginForm = () => (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={loginData.email} onChange={handleLoginChange} required className="w-full border border-gray-300 p-2 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input type="password" name="password" value={loginData.password} onChange={handleLoginChange} required className="w-full border border-gray-300 p-2 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Login Role</label>
                <select name="role" value={loginData.role} onChange={handleLoginChange} required className="w-full border border-gray-300 p-2 rounded-md">
                    <option value="client">Client</option>
                    <option value="freelancer">Freelancer</option>
                </select>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400">
                {loading ? 'Verifying...' : 'Log In'}
            </button>
        </form>
    );

    // Renders the MFA code input form
    const renderMfaForm = () => (
        <form onSubmit={handleMfaSubmit} className="space-y-4">
            <p className="text-sm text-yellow-600">MFA Required: Enter the code sent to your email/SMS.</p>
            <div>
                <label className="block text-sm font-medium text-gray-700">MFA Code</label>
                <input type="text" name="mfaCode" value={mfaData.mfaCode} onChange={handleMfaChange} required className="w-full border border-gray-300 p-2 rounded-md" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                {loading ? 'Verifying Code...' : 'Verify Code'}
            </button>
            <button type="button" onClick={() => setStep('login')} className="w-full mt-2 py-2 text-sm text-gray-600 hover:text-red-500">
                Cancel / Back to Login
            </button>
        </form>
    );


    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-xl">
                <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">PocketLancer Login</h1>
                
                {error && (
                    <p className="text-red-500 bg-red-100 p-3 rounded mb-4 text-sm">{error}</p>
                )}

                {step === 'login' ? renderLoginForm() : renderMfaForm()}
            </div>
        </div>
    );
}

export default LoginPage;