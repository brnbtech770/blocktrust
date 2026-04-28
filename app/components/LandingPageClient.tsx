"use client";

import Navbar from "./landing/Navbar";
import Hero from "./landing/Hero";
import Problem from "./landing/Problem";
import Categories from "./landing/Categories";
import Solution from "./landing/Solution";
import Particuliers from "./landing/Particuliers";
import Entreprises from "./landing/Entreprises";
import Integration from "./landing/Integration";
import PricingTeaser from "./landing/PricingTeaser";
import FinalCTA from "./landing/FinalCTA";
import Footer from "./landing/Footer";

export default function LandingPageClient() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bt-circuit-bg"
      style={{ background: "var(--bt-navy)" }}
    >
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Categories />
        <Solution />
        <Particuliers />
        <Entreprises />
        <Integration />
        <PricingTeaser />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
