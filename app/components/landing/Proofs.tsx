"use client";

import { Award, Anchor, ShieldCheck, KeyRound, type LucideIcon } from "lucide-react";
import Reveal from "./Reveal";

const proofs: { icon: LucideIcon; text: string }[] = [
  { icon: Award, text: "BLOCKTRUST™ — INPI n°5253718" },
  { icon: Anchor, text: "Badges ancrés sur Polygon Mainnet" },
  { icon: ShieldCheck, text: "Données hébergées en Europe · RGPD" },
  { icon: KeyRound, text: "Code horodaté · OpenTimestamps (Bitcoin)" },
];

export default function Proofs() {
  return (
    <section
      id="proofs"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-16"
    >
      <Reveal className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {proofs.map((p) => {
          const Icon = p.icon;
          return (
            <span
              key={p.text}
              className="flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-center text-[11px] leading-tight text-white/55 sm:text-xs"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-bt-cyan/70" aria-hidden />
              <span>{p.text}</span>
            </span>
          );
        })}
      </Reveal>
    </section>
  );
}
