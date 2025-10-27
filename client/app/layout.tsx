// client/app/layout.tsx (or layout.js)

import React from 'react';
import Link from 'next/link';
import './globals.css';

// --- Component: Header (The Main Navigation Bar) ---
const Header = () => (
    <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            
            {/* Logo/Brand Name */}
            <Link href="/">
                <p className="text-3xl font-extrabold text-blue-600 hover:text-blue-700 transition">
                    PocketLancer
                </p>
            </Link>

            {/* Navigation Links (Desktop) */}
            <nav className="hidden md:flex space-x-6 text-lg">
                <Link href="/">
                    <p className="text-gray-700 hover:text-blue-600 transition font-medium">Home</p>
                </Link>
                <Link href="/search">
                    <p className="text-gray-700 hover:text-blue-600 transition font-medium">Find Services</p>
                </Link>
                <Link href="/about">
                    <p className="text-gray-700 hover:text-blue-600 transition font-medium">About Us</p>
                </Link>
                <Link href="/contact">
                    <p className="text-gray-700 hover:text-blue-600 transition font-medium">Contact Us</p>
                </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="space-x-4">
                <Link href="/login">
                    <button className="text-blue-600 border border-blue-600 py-2 px-4 rounded-lg font-semibold hover:bg-blue-50 transition duration-300">
                        Log In
                    </button>
                </Link>
                <Link href="/register">
                    <button className="bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition duration-300">
                        Register
                    </button>
                </Link>
            </div>
            
            {/* Hamburger/Mobile menu icon would go here */}
        </div>
    </header>
);

// --- Component: Footer ---
const Footer = () => (
    <footer className="bg-gray-800 text-white mt-auto">
        <div className="container mx-auto px-4 py-8 text-center">
            <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-8 mb-6 text-sm">
                <Link href="/terms"><p className="hover:text-blue-400 transition">Terms of Service</p></Link>
                <Link href="/privacy"><p className="hover:text-blue-400 transition">Privacy Policy</p></Link>
                <Link href="/freelancer/availability"><p className="hover:text-blue-400 transition">For Freelancers</p></Link>
            </div>
            <p className="text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} PocketLancer. All rights reserved.
            </p>
        </div>
    </footer>
);
interface RootLayoutProps {
    children: React.ReactNode;
}
// --- Component: Root Layout ---
export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="en">
            <body className="flex flex-col min-h-screen bg-gray-50">
                <Header />
                <main className="flex-grow">
                    {children}
                </main>
                <Footer />
            </body>
        </html>
    );
}