"use client";

import type { ReactNode } from "react";
import Navbar from "./landing/Navbar";
import Hero from "./landing/Hero";
import QuickUnderstand from "./landing/QuickUnderstand";
import Problem from "./landing/Problem";
import Categories from "./landing/Categories";
import BlocktrustAmbassadorBadge from "./landing/BlocktrustAmbassadorBadge";
import Solution from "./landing/Solution";
import Particuliers from "./landing/Particuliers";
import Entreprises from "./landing/Entreprises";
import Integration from "./landing/Integration";
import PricingTeaser from "./landing/PricingTeaser";
import TrustMonitoring from "./landing/TrustMonitoring";
import TrustGraph from "./landing/TrustGraph";
import FinalCTA from "./landing/FinalCTA";
import Proofs from "./landing/Proofs";
import Footer from "./landing/Footer";

/** Passé depuis `app/page.tsx` (RSC) pour conserver `ThreatAlert` en Server Component. */
export default function LandingPageClient({
  threatAlert,
  siteCertId,
}: {
  threatAlert: ReactNode;
  siteCertId?: string | null;
}) {
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
        <Categories />
        {siteCertId ? <BlocktrustAmbassadorBadge certId={siteCertId} /> : null}
        {threatAlert}
        <Solution />
        <Particuliers />
        <Entreprises />
        <Integration />
        <PricingTeaser />
        <TrustMonitoring />
        <TrustGraph />
        <FinalCTA />
        <Proofs />
      </main>
      <Footer />
    </div>
  );
}
