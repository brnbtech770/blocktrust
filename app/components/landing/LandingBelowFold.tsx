"use client";

import type { ReactNode } from "react";
import Problem from "./Problem";
import QuickUnderstand from "./QuickUnderstand";
import BisSection from "./BisSection";
import Categories from "./Categories";
import Solution from "./Solution";
import Particuliers from "./Particuliers";
import Entreprises from "./Entreprises";
import Integration from "./Integration";
import PricingTeaser from "./PricingTeaser";
import TrustMonitoring from "./TrustMonitoring";
import TrustGraph from "./TrustGraph";
import FinalCTA from "./FinalCTA";
import Proofs from "./Proofs";
import Footer from "./Footer";

type Props = {
  threatAlert: ReactNode;
};

/** Sections landing sous le hero — chunk séparé pour réduire le JS initial. */
export default function LandingBelowFold({ threatAlert }: Props) {
  return (
    <>
      <Problem />
      {threatAlert}
      <Solution />
      <QuickUnderstand />
      <BisSection />
      <Categories />
      <Particuliers />
      <Entreprises />
      <Integration />
      <PricingTeaser />
      <TrustMonitoring />
      <TrustGraph />
      <FinalCTA />
      <Proofs />
      <Footer />
    </>
  );
}
