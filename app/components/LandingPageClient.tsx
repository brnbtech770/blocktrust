"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import Navbar from "./landing/Navbar";
import Hero from "./landing/Hero";

const LandingBelowFold = dynamic(() => import("./landing/LandingBelowFold"), {
  loading: () => null,
});

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
        <LandingBelowFold threatAlert={threatAlert} />
      </main>
    </div>
  );
}
