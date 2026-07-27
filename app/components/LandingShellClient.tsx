"use client";

import Navbar from "./landing/Navbar";
import Hero from "./landing/Hero";

/** Navbar + Hero uniquement — sections below-fold rendues en RSC depuis app/page.tsx. */
export default function LandingShellClient() {
  return (
    <>
      <Navbar />
      <Hero />
    </>
  );
}
