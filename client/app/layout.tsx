import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Providers from "./providers";
import HeaderWrapper from "@/components/HeaderWrapper";
import Footer from "@/components/Footer";
import ThemeInit from "@/components/ThemeInit";
import FreelancerChatWidget from "@/components/FreelancerChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PocketLancer | Professional Freelance Marketplace",
  description: "Connect with top talent and find your next big project.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100`}
      >
        {/*
          Razorpay checkout SDK.

          ✅ FIX: Changed from "beforeInteractive" to "afterInteractive".

          "beforeInteractive" was loading Razorpay (and all 80+ of its lazy
          chunks) BEFORE React/Next.js could hydrate — blocking every single
          page in the app from rendering until Razorpay finished (~80 seconds
          on a slow connection). This caused the "stuck at Compiling" symptom
          on any page, most visibly on the freelancer public profile.

          "afterInteractive" loads Razorpay after the page is interactive.
          window.Razorpay is still available by the time the user clicks
          "Pay" because the booking flow requires several steps first.
        */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />

        <Providers>
          <HeaderWrapper />
          <ThemeInit />
          <main className="flex-grow">{children}</main>
          <Footer />
          {/* Global floating chat widget — visible on all pages for logged-in users */}
          <FreelancerChatWidget />
        </Providers>
      </body>
    </html>
  );
}
