"use client";

import { Activity, Check } from "lucide-react";
import Reveal from "./Reveal";

const points: string[] = [
  "Surveillance continue de vos contacts certifiés.",
  "TrustScore mis à jour en temps réel.",
  "Détection proactive des signaux faibles — avant l'incident.",
];

export default function TrustMonitoring() {
  return (
    <section
      id="trust-monitoring"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20"
    >
      <Reveal className="mx-auto max-w-3xl rounded-2xl border border-bt-cyan/15 bg-white/[0.025] p-6 sm:p-10">
        <p className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] neon-cyan">
          <Activity className="h-4 w-4" aria-hidden />
          Trust Monitoring
        </p>
        <h2 className="font-syne mx-auto max-w-3xl text-balance text-xl font-semibold leading-snug text-white sm:text-2xl lg:text-3xl">
          BLOCKTRUST™ ne se contente pas d&apos;alerter —{" "}
          <span className="text-bt-cyan">il surveille.</span>
        </h2>

        <ul className="mt-6 flex flex-col gap-3">
          {points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-bt-cyan" strokeWidth={2.5} aria-hidden />
              <span className="text-sm leading-snug text-white/80 sm:text-base">{point}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
