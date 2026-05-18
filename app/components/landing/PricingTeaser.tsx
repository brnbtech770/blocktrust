"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Building2, User } from "lucide-react";
import {
  ESSENTIEL_MONTHLY_EUR,
  formatPriceFr,
  STARTER_MONTHLY_PER_USER_HT_EUR,
} from "@/lib/pricing";
import Reveal from "./Reveal";

export default function PricingTeaser() {
  return (
    <section
      id="pricing"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] neon-gold">
          <Sparkles className="h-4 w-4" />
          Tarifs
        </p>
        <h2 className="font-syne mx-auto max-w-2xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
          Un plan adapté à <span className="text-bt-cyan">chaque besoin</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          Particuliers ou entreprises — démarrez sans engagement, annulez à tout moment.
        </p>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <Reveal
          delay={0}
          className="rounded-2xl border border-bt-cyan/30 bg-white/[0.04] p-6 transition-all hover:-translate-y-1 hover:border-bt-cyan/60 sm:p-8"
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-bt-cyan/30 bg-bt-cyan/10">
            <User className="h-5 w-5 text-bt-cyan" />
          </div>
          <h3 className="font-syne text-base font-semibold text-white sm:text-lg">Particulier</h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 whitespace-nowrap">
            <span className="text-sm font-medium text-white/50">À partir de</span>
            <span className="font-syne text-2xl font-bold text-white sm:text-3xl">
              {formatPriceFr(ESSENTIEL_MONTHLY_EUR)}€
            </span>
            <span className="text-xs text-white/60 sm:text-sm">TTC/mois</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/70 sm:text-sm">
            Vérifications illimitées* pendant la période de lancement. Badge certifié, QR code, signature email, page
            de vérification publique.
          </p>
        </Reveal>

        <Reveal
          delay={150}
          className="rounded-2xl border border-gold/40 bg-white/[0.04] p-6 transition-all hover:-translate-y-1 hover:border-gold/70 sm:p-8"
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
            <Building2 className="h-5 w-5 text-gold" />
          </div>
          <h3 className="font-syne text-base font-semibold text-white sm:text-lg">Entreprise</h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 whitespace-nowrap">
            <span className="text-sm font-medium text-white/60">À partir de</span>
            <span className="font-syne text-2xl font-bold text-white sm:text-3xl">
              {formatPriceFr(STARTER_MONTHLY_PER_USER_HT_EUR)}€
            </span>
            <span className="text-xs text-white/60 sm:text-sm">HT/user/mois</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/50 sm:text-sm">
            Solo Pro · Starter · Team · Business · Enterprise sur devis
          </p>
          <p className="mt-3 text-xs leading-relaxed text-white/70 sm:text-sm">
            API B2B, multi-comptes, vérification d&apos;identité avancée, intégrations dédiées.
          </p>
        </Reveal>
      </div>

      <Reveal delay={250} className="mt-10 flex flex-col items-center justify-center gap-2">
        <Link
          href="/pricing"
          className="group inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-bt-cyan/60 hover:text-bt-cyan sm:text-base"
        >
          Voir tous les plans
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
        <p className="text-white/30 text-xs text-center mt-3 max-w-lg mx-auto leading-relaxed">
          * Vérifications illimitées pendant la période de lancement (6 mois).{' '}
          <Link href="/pricing" className="text-white/45 underline-offset-2 hover:text-bt-cyan">
            Voir les tarifs
          </Link>
        </p>
        <p className="text-white/30 text-xs text-center mt-2">
          Sans engagement · Résiliable à tout moment
        </p>
      </Reveal>
    </section>
  );
}
