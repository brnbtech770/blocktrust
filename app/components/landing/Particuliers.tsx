"use client";

import Link from "next/link";
import { Briefcase, ShoppingBag, User, type LucideIcon } from "lucide-react";
import Reveal from "./Reveal";

type UseCase = { icon: LucideIcon; title: string; text: string };

const cases: UseCase[] = [
  {
    icon: Briefcase,
    title: "Freelances & consultants",
    text: "Prouvez votre sérieux à chaque nouveau client.",
  },
  {
    icon: ShoppingBag,
    title: "Vendeurs en ligne",
    text: "Rassurez vos acheteurs sur votre authenticité.",
  },
  {
    icon: User,
    title: "Particuliers actifs",
    text: "Protégez vos échanges : location, covoiturage, petites annonces.",
  },
];

export default function Particuliers() {
  return (
    <section
      id="particuliers"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-bt-cyan/80">
          Pour les particuliers
        </p>
        <h2 className="font-syne text-2xl font-extrabold leading-tight text-white sm:text-4xl">
          Protégez votre <span className="text-bt-cyan">réputation personnelle</span> en ligne
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
        {cases.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal
              key={c.title}
              delay={150 * i}
              className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:-translate-y-1 hover:border-bt-cyan/40 hover:shadow-glow-cyan"
            >
              <div
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-bt-cyan/30"
                style={{ background: "rgba(0,212,255,0.08)" }}
              >
                <Icon className="h-6 w-6 text-bt-cyan" />
              </div>
              <h3 className="font-syne mb-2 text-lg font-bold text-white">
                {c.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/70">{c.text}</p>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={300} className="mt-10 flex justify-center">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-xl bg-bt-cyan px-8 py-3.5 text-sm font-bold text-navy transition-all hover:scale-[1.04] hover:bg-[#21dfff] sm:text-base"
        >
          Démarrer pour 4,99€/mois
        </Link>
      </Reveal>
    </section>
  );
}
