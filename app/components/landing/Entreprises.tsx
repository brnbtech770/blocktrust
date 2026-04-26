"use client";

import Link from "next/link";
import { Building2, Rocket, Banknote, ShoppingCart, type LucideIcon } from "lucide-react";
import Reveal from "./Reveal";

type UseCase = { icon: LucideIcon; title: string; text: string };

const cases: UseCase[] = [
  {
    icon: Building2,
    title: "Agences immo",
    text: "Mandats authentifiés, agents vérifiés.",
  },
  {
    icon: Rocket,
    title: "Startups & tech",
    text: "Due diligence simplifiée, crédibilité investisseurs.",
  },
  {
    icon: Banknote,
    title: "Finance & crypto",
    text: "KYC/AML renforcé, conformité prouvée.",
  },
  {
    icon: ShoppingCart,
    title: "E-commerce",
    text: "Réduisez les abandons panier, augmentez la confiance.",
  },
];

export default function Entreprises() {
  return (
    <section
      id="entreprises"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-gold/80">
          Pour les entreprises
        </p>
        <h2 className="font-syne text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
          Sécurisez chaque interaction <span className="text-gold">B2B</span>
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {cases.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal
              key={c.title}
              delay={120 * i}
              className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:-translate-y-1 hover:border-gold/40 hover:shadow-glow-gold"
            >
              <div
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-gold/30"
                style={{ background: "rgba(189,167,107,0.10)" }}
              >
                <Icon className="h-6 w-6 text-gold" />
              </div>
              <h3 className="font-syne mb-2 text-lg sm:text-xl font-semibold text-white">
                {c.title}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-white/70">{c.text}</p>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={300} className="mt-10 flex justify-center">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-xl border border-gold/60 bg-gold/10 px-8 py-3.5 text-sm font-bold text-gold transition-all hover:scale-[1.04] hover:bg-gold/20 sm:text-base"
        >
          Voir les forfaits entreprise
        </Link>
      </Reveal>
    </section>
  );
}
