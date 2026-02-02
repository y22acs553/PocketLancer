"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CalendarCheck2,
  MapPin,
  ShieldCheck,
  Star,
  Users,
  Zap,
  Sparkles,
  Search as SearchIcon,
  LayoutDashboard,
} from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const { user } = useUser();

  const primaryCta = useMemo(() => {
    if (!user) return { href: "/register", label: "Create Account" };
    if (user.role === "freelancer")
      return {
        href: "/dashboard/freelancer",
        label: "Go to Freelancer Dashboard",
      };
    return { href: "/search", label: "Find Freelancers" };
  }, [user]);

  return (
    <div className="w-full">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
        {/* glow blobs */}
        <div className="absolute -top-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-56 h-[34rem] w-[34rem] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative px-6 py-14 sm:px-10 lg:px-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* LEFT */}
            <motion.div
              className="lg:col-span-7"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                <BadgeCheck size={16} className="text-blue-500" />
                PocketLancer Marketplace
              </p>

              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                Hire trusted freelancers{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  near your location
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300">
                PocketLancer helps you discover verified service professionals,
                compare pricing, and book appointments — faster and safer.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black text-white shadow-sm hover:bg-slate-800 transition dark:bg-white dark:text-slate-900"
                >
                  {primaryCta.label} <ArrowRight size={18} />
                </Link>

                <Link
                  href="/search"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-900 shadow-sm hover:bg-slate-50 transition dark:border-white/10 dark:bg-slate-950 dark:text-white dark:hover:bg-white/5"
                >
                  <MapPin
                    size={18}
                    className="text-slate-500 dark:text-slate-300"
                  />
                  Explore Search
                </Link>
              </div>

              {/* trust badges */}
              <div className="mt-8 flex flex-wrap gap-3">
                <TrustPill
                  icon={<ShieldCheck size={16} />}
                  text="JWT Secure Sessions"
                />
                <TrustPill
                  icon={<BadgeCheck size={16} />}
                  text="Verified Profiles"
                />
                <TrustPill
                  icon={<CalendarCheck2 size={16} />}
                  text="Instant Booking"
                />
              </div>
            </motion.div>

            {/* RIGHT - interactive preview */}
            <motion.div
              className="lg:col-span-5"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
            >
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Live Preview
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                      A quick look at your workflow.
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20">
                    <Sparkles size={14} />
                    Interactive
                  </span>
                </div>

                {/* Preview UI */}
                <div className="mt-6 space-y-3">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-3xl bg-slate-50 p-5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        Search freelancers
                      </p>
                      <SearchIcon size={18} className="text-slate-400" />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      Nearby · Verified · Rated
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-3xl bg-slate-50 p-5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        Book instantly
                      </p>
                      <CalendarCheck2 size={18} className="text-slate-400" />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      Pending → Confirmed → Completed
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-3xl bg-slate-50 p-5 ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        Manage dashboard
                      </p>
                      <LayoutDashboard size={18} className="text-slate-400" />
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      Jobs · Reviews · Profile strength
                    </p>
                  </motion.div>
                </div>

                {/* Stats row */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <StatBox label="Avg rating" value="4.8+" />
                  <StatBox label="Faster hiring" value="2x" />
                  <StatBox label="Local search" value="GPS" />
                  <StatBox label="Verified" value="100%" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-white/10" />

        {/* Features */}
        <div className="relative px-6 py-10 sm:px-10 lg:px-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Built for reliability
            </p>

            <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Features that feel premium
            </h2>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <FeatureCard
                icon={<MapPin size={20} />}
                title="Geo-Based Matching"
                desc="Nearby discovery powered by MongoDB 2dsphere geo queries."
              />
              <FeatureCard
                icon={<ShieldCheck size={20} />}
                title="Secure Login + MFA"
                desc="JWT-based secure sessions with OTP & reset password flow."
              />
              <FeatureCard
                icon={<Briefcase size={20} />}
                title="Bookings Workflow"
                desc="Pending → Confirmed → Completed actions by role."
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-10 px-2 sm:px-0">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-950">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Simple flow
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                How PocketLancer works
              </h3>
              <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                Designed to get jobs booked with minimum friction.
              </p>
            </div>

            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-6 py-3 text-sm font-black text-white shadow-sm hover:shadow-md transition"
            >
              <Zap size={18} />
              Start Searching
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard
              step="01"
              title="Search Nearby"
              desc="Choose radius, type skill/service keyword, and search by GPS."
            />
            <StepCard
              step="02"
              title="Compare & Book"
              desc="Open profile, check pricing + distance, then book instantly."
            />
            <StepCard
              step="03"
              title="Track & Review"
              desc="Booking updates + transparent reviews for trust."
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mt-10">
        <motion.div
          className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-12 text-white shadow-sm"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 className="text-3xl font-black tracking-tight">
                Ready to hire faster?
              </h3>
              <p className="mt-2 text-sm font-bold text-slate-200">
                Search verified freelancers around you and book in minutes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/search"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-900 hover:bg-slate-100 transition"
              >
                Find Freelancers <ArrowRight size={18} />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 px-6 py-3 text-sm font-black text-white hover:bg-white/10 transition"
              >
                Join as Freelancer
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <div className="h-10" />
    </div>
  );
}

/* ---------------- helpers ---------------- */

function TrustPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-black/5 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10">
      <span className="text-slate-500 dark:text-slate-300">{icon}</span>
      {text}
    </span>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950">
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-lg font-black text-slate-900 dark:text-white">
            {title}
          </p>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            {desc}
          </p>
        </div>

        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function StepCard({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition dark:border-white/10 dark:bg-slate-950"
    >
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
        Step {step}
      </p>
      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">
        {title}
      </p>
      <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
        {desc}
      </p>
    </motion.div>
  );
}
