"use client";

import { Network, Check } from "lucide-react";
import Reveal from "./Reveal";

const points: string[] = [
  "Chaque interaction certifiée enrichit le réseau.",
  "Identité + contexte + relations + historique + propagation.",
  "Plus le réseau grandit, plus chaque profil devient précis.",
];

export default function TrustGraph() {
  return (
    <section
      id="trust-graph"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20"
    >
      <Reveal className="mx-auto max-w-3xl rounded-2xl border border-gold/15 bg-white/[0.025] p-6 sm:p-10">
        <p className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] neon-gold">
          <Network className="h-4 w-4" aria-hidden />
          Trust Graph
        </p>
        <h2 className="font-syne mx-auto w-full text-center text-[clamp(0.875rem,2.5vw+0.5rem,1.75rem)] font-semibold leading-snug whitespace-nowrap text-white">
          Une infrastructure que{" "}
          <span className="text-gold">personne ne peut copier.</span>
        </h2>

        <ul className="mt-6 flex flex-col gap-3">
          {points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={2.5} aria-hidden />
              <span className="text-sm leading-snug text-white/80 sm:text-base">{point}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
