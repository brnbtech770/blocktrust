"use client";

import { Network } from "lucide-react";
import Reveal from "./Reveal";

const accumulation: string[] = [
  "Identité",
  "Contexte",
  "Relations",
  "Historique",
  "Propagation",
];

export default function TrustGraph() {
  return (
    <section
      id="trust-graph"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] neon-gold">
          <Network className="h-4 w-4" />
          Trust Graph
        </p>
        <h2 className="font-syne mx-auto max-w-2xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
          L&apos;infrastructure que les concurrents{" "}
          <span className="text-gold">ne peuvent pas copier</span>.
        </h2>
      </Reveal>

      <Reveal delay={120} className="mx-auto mt-8 max-w-3xl">
        <p className="text-sm leading-relaxed text-white/70 sm:text-base">
          L&apos;identité seule ne suffit pas. Le KYC seul ne suffit pas. Ce qui crée de la
          confiance, c&apos;est l&apos;accumulation :
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {accumulation.map((item, i) => (
            <span key={item} className="flex items-center gap-2.5">
              <span className="rounded-full border border-bt-cyan/30 bg-bt-cyan/10 px-3.5 py-1.5 text-xs font-semibold text-bt-cyan">
                {item}
              </span>
              {i < accumulation.length - 1 && (
                <span aria-hidden className="text-white/30">
                  +
                </span>
              )}
            </span>
          ))}
        </div>

        <p className="mt-6 text-sm leading-relaxed text-white/70 sm:text-base">
          C&apos;est le <span className="font-semibold text-white">Trust Graph</span> de BLOCKTRUST.
          Chaque interaction certifiée enrichit le réseau. Chaque relation de confiance renforce la
          robustesse de l&apos;ensemble. Plus le réseau grandit, plus chaque profil devient précis et
          difficile à usurper.
        </p>
      </Reveal>
    </section>
  );
}
