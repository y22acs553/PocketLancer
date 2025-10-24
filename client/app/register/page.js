// /client/app/register/page.js

"use client";

import React, { useState } from 'react';
import api from '../../services/api'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'client', // Default to Client registration
        skills: ''     // Only for Freelancer role
    });
    const [successMsg, setSuccessMsg] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        // Determine the correct API endpoint based on the role
        const endpoint = `/auth/register/${formData.role}`;
        
        // Prepare the data payload
        const payload = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            // Include skills only if registering as a freelancer
            ...(formData.role === 'freelancer' && { skills: formData.skills.split(',').map(s => s.trim()) })
        };
        
        try {
            const response = await api.post(endpoint, payload);
            
            setSuccessMsg(response.data.msg || 'Registration successful!');
            
            // Redirect to login after successful registration
            setTimeout(() => {
                router.push('/login');
            }, 2000);

        } catch (err) {
            console.error("Registration Error:", err);
            setError(err.response?.data?.msg || 'Registration failed. Check if email is already in use.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50">
            <div className="w-full max-w-lg p-8 bg-white shadow-xl rounded-xl">
                <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Join PocketLancer</h1>
                
                {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4 text-sm">{error}</p>}
                {successMsg && <p className="text-green-600 bg-green-100 p-3 rounded mb-4 text-sm">{successMsg}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">I want to register as:</label>
                        <select name="role" value={formData.role} onChange={handleChange} required className="w-full border border-gray-300 p-2 rounded-md">
                            <option value="client">Client (Need Services)</option>
                            <option value="freelancer">Freelancer (Offer Services)</option>
                        </select>
                    </div>

                    {/* Name, Email, Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full border border-gray-300 p-2 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full border border-gray-300 p-2 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full border border-gray-300 p-2 rounded-md" />
                    </div>

                    {/* Conditional Skills Input (Freelancer Only) */}
                    {formData.role === 'freelancer' && (
                        <div className="bg-yellow-50 p-4 rounded-md">
                            <label className="block text-sm font-medium text-gray-700">Skills (Comma-separated: e.g., plumbing, electric)</label>
                            <input type="text" name="skills" value={formData.skills} onChange={handleChange} required={formData.role === 'freelancer'} className="mt-1 block w-full border border-gray-300 p-2 rounded-md" />
                            <p className="text-xs text-gray-500 mt-1">Clients will search for your skills here.</p>
                        </div>
                    )}
                    
                    <button type="submit" disabled={loading} className="w-full py-2 px-4 rounded-md shadow-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                        {loading ? 'Processing...' : 'Register Account'}
                    </button>
                    
                    <p className="text-center text-sm">
                        Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Log in here</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default RegisterPage;