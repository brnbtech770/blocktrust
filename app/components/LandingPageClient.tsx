"use client";

import type { ReactNode } from "react";
import Navbar from "./landing/Navbar";
import Hero from "./landing/Hero";
import QuickUnderstand from "./landing/QuickUnderstand";
import Problem from "./landing/Problem";
import Categories from "./landing/Categories";
import Solution from "./landing/Solution";
import Particuliers from "./landing/Particuliers";
import Entreprises from "./landing/Entreprises";
import Integration from "./landing/Integration";
import TrustMonitoring from "./landing/TrustMonitoring";
import TrustGraph from "./landing/TrustGraph";
import PricingTeaser from "./landing/PricingTeaser";
import FinalCTA from "./landing/FinalCTA";
import Footer from "./landing/Footer";

/** Passé depuis `app/page.tsx` (RSC) pour conserver `ThreatAlert` en Server Component. */
export default function LandingPageClient({ threatAlert }: { threatAlert: ReactNode }) {
  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--bt-navy)" }}
    >
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <QuickUnderstand />
        <Solution />
        <Categories />
        {threatAlert}
        <Particuliers />
        <Entreprises />
        <Integration />
        <TrustMonitoring />
        <TrustGraph />
        <PricingTeaser />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
