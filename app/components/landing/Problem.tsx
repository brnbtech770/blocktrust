"use client";

import { User, Building2, X } from "lucide-react";
import Reveal from "./Reveal";

const particuliers: string[] = [
  "Faux SMS / faux emails",
  "Faux artisans, faux vendeurs",
  "Faux conseillers bancaires",
  "Faux profils sur les marketplaces",
  "Faux RIB",
];

const professionnels: string[] = [
  "Fraude au président",
  "Faux fournisseurs / faux clients",
  "Usurpation d'identité",
  "Faux partenaires",
  "Faux wallets / faux projets Web3",
];

export default function Problem() {
  return (
    <section
      id="probleme"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-24 lg:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] neon-red">
          Le problème
        </p>
        <h2 className="font-syne mx-auto max-w-3xl text-balance text-2xl font-semibold leading-snug text-white sm:text-3xl">
          L&apos;usurpation de confiance est{" "}
          <span className="text-red-400">la norme</span>.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-sm leading-relaxed text-white/70 sm:text-base">
          Un email, un appel, un document ou un paiement ne garantit plus que l&apos;interlocuteur
          est légitime.
          <br />
          Le problème n&apos;est pas l&apos;identité — c&apos;est la confiance.
        </p>
      </Reveal>

      <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
        <Reveal className="rounded-xl border border-red-500/20 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center gap-3">
            <div
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg"
              style={{ background: "rgba(224,82,82,0.1)", border: "1px solid rgba(224,82,82,0.25)" }}
            >
              <User className="h-5 w-5" style={{ color: "#E05252" }} />
            </div>
            <h3 className="font-syne text-balance text-base font-semibold text-white">Particuliers</h3>
          </div>
          <ul className="space-y-2.5">
            {particuliers.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/70">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" strokeWidth={2.5} aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={150} className="rounded-xl border border-red-500/20 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center gap-3">
            <div
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg"
              style={{ background: "rgba(224,82,82,0.1)", border: "1px solid rgba(224,82,82,0.25)" }}
            >
              <Building2 className="h-5 w-5" style={{ color: "#E05252" }} />
            </div>
            <h3 className="font-syne text-balance text-base font-semibold text-white">Professionnels</h3>
          </div>
          <ul className="space-y-2.5">
            {professionnels.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/70">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" strokeWidth={2.5} aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <Reveal delay={250} className="mx-auto mt-12 max-w-2xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-white/45">
          La question
        </p>
        <p className="font-syne mx-auto max-w-3xl text-balance text-xl font-semibold italic leading-snug text-bt-cyan sm:text-2xl">
          Puis-je faire confiance à cette interaction ?
        </p>
      </Reveal>
    </section>
  );
}
