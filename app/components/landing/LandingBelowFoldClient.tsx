"use client";

import QuickUnderstand from "./QuickUnderstand";
import Categories from "./Categories";
import Particuliers from "./Particuliers";
import Entreprises from "./Entreprises";
import Integration from "./Integration";
import PricingTeaser from "./PricingTeaser";
import TrustMonitoring from "./TrustMonitoring";
import TrustGraph from "./TrustGraph";
import FinalCTA from "./FinalCTA";
import Footer from "./Footer";

/** Sections landing interactives (scroll, compteurs, newsletter). */
export default function LandingBelowFoldClient() {
  return (
    <>
      <QuickUnderstand />
      <Categories />
      <Particuliers />
      <Entreprises />
      <Integration />
      <PricingTeaser />
      <TrustMonitoring />
      <TrustGraph />
      <FinalCTA />
      <Footer />
    </>
  );
}
