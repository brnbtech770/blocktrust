"use client";

import Link from "next/link";
import { Briefcase, ShoppingBag, User, ShieldAlert, type LucideIcon } from "lucide-react";
import { LANDING_CTA_B2C_LABEL } from "@/lib/pricing";
import Reveal from "./Reveal";

type UseCase = { icon: LucideIcon; title: string; text: string; example: string };

const cases: UseCase[] = [
  {
    icon: Briefcase,
    title: "Freelances & consultants",
    text: "Prouvez votre sérieux auprès de chacun de vos nouveaux clients.",
    example: "Ex : votre nouveau client vérifie votre badge avant de signer un devis ou un contrat.",
  },
  {
    icon: ShoppingBag,
    title: "Vendeurs en ligne",
    text: "Rassurez vos acheteurs sur votre existence et votre identité.",
    example:
      "Ex : votre acheteur LeBonCoin scanne votre QR code avant d'effectuer son virement.",
  },
  {
    icon: User,
    title: "Particuliers actifs",
    text: "Protégez vos échanges : location, covoiturage, petites annonces.",
    example: "Ex : le propriétaire d'un bien vérifie votre identité avant d'effectuer une visite.",
  },
  {
    icon: ShieldAlert,
    title: "Protégez-vous des menaces par mail",
    text: "Certifiez vos contacts principaux : banque, mutuelle, sécurité sociale, médecin, employeur — toute tentative d'usurpation déclenche une alerte immédiate.",
    example: "Ex : vous recevez un email de \"votre banque\" — BLOCKTRUST signale instantanément qu'il n'est pas certifié.",
  },
];

export default function Particuliers() {
  return (
    <section
      id="particuliers"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center overflow-visible">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">
          Pour les particuliers &amp; professionnels indépendants
        </p>
        <h2 className="font-syne mx-auto max-w-3xl text-balance pb-2 text-2xl font-semibold leading-snug text-white sm:text-3xl">
          Protégez votre <span className="text-bt-cyan">réputation personnelle</span> en ligne
        </h2>
        <p className="mx-auto mb-8 mt-4 max-w-2xl text-balance text-center text-sm leading-relaxed text-white/40">
          Particuliers, indépendants, freelances — BLOCKTRUST s&apos;adapte à votre usage
        </p>
      </Reveal>

      <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
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
              <h3 className="font-syne mb-2 text-balance text-base font-semibold text-white">
                {c.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/70">{c.text}</p>
              <p className="mt-3 text-xs leading-relaxed text-white/50 sm:text-sm">
                {c.example}
              </p>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={300} className="mt-10 flex justify-center">
        <Link
          href="/pricing"
          className="inline-flex min-h-[52px] w-full max-w-sm cursor-pointer items-center justify-center rounded-xl bg-bt-cyan px-8 py-3.5 text-sm font-bold text-navy transition-all hover:scale-[1.04] hover:bg-[#21dfff] sm:w-auto sm:text-base"
        >
          {LANDING_CTA_B2C_LABEL}
        </Link>
      </Reveal>
    </section>
  );
}
