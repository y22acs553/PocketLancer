import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
