"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Building2, User } from "lucide-react";
import Reveal from "./Reveal";

export default function PricingTeaser() {
  return (
    <section
      id="pricing"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-bt-cyan/80">
          <Sparkles className="h-3.5 w-3.5" />
          Tarifs
        </p>
        <h2 className="font-syne mx-auto max-w-2xl text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
          Un plan adapté à <span className="text-bt-cyan">chaque besoin</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-white/70">
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
          <h3 className="font-syne text-base sm:text-lg font-semibold text-white">Particulier</h3>
          <div className="mt-2 flex items-end gap-1">
            <span className="font-syne text-3xl font-bold text-white">4,99€</span>
            <span className="mb-1 text-sm text-white/60">/mois</span>
          </div>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/70">
            Badge certifié, QR code, signature email, page de vérification publique.
          </p>
        </Reveal>

        <Reveal
          delay={150}
          className="rounded-2xl border border-gold/40 bg-white/[0.04] p-6 transition-all hover:-translate-y-1 hover:border-gold/70 sm:p-8"
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
            <Building2 className="h-5 w-5 text-gold" />
          </div>
          <h3 className="font-syne text-base sm:text-lg font-semibold text-white">Entreprise</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-medium text-white/60">À partir de</span>
            <span className="font-syne text-3xl font-bold text-white">29€</span>
            <span className="text-sm text-white/60">/mois</span>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Starter · Team · Business · Enterprise sur devis
          </p>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/70">
            API B2B, multi-comptes, conformité KYC/AML, intégrations dédiées.
          </p>
        </Reveal>
      </div>

      <Reveal delay={250} className="mt-10 flex justify-center">
        <Link
          href="/pricing"
          className="group inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-bt-cyan/60 hover:text-bt-cyan sm:text-base"
        >
          Voir tous les plans
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </section>
  );
}
