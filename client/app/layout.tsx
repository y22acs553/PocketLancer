import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeaderWrapper from "@/components/HeaderWrapper";
import ThemeInit from "@/components/ThemeInit";

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
        <Providers>
          {/* ✅ Show Header only on non-dashboard routes */}
          <HeaderWrapper />
          <ThemeInit />
          <main className="flex-grow">{children}</main>

          {/* ✅ Optional: hide footer on dashboard too */}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
