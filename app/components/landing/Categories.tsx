import { Check, X, AlertTriangle } from "lucide-react";
import Reveal from "./Reveal";

const sansBlocktrust: string[] = [
  "Profil créé hier",
  "Téléphone inconnu",
  "Email jetable",
  "Aucun historique",
];

const avecBlocktrust: string[] = [
  "Identité vérifiée",
  "Compte actif depuis 3 ans",
  "TrustScore 87",
  "17 interactions certifiées",
  "Aucun signal de vigilance",
];

const verticales: string[] = [
  "Immobilier (faux docs, faux RIB)",
  "Marketplaces",
  "PME",
  "Finance",
  "Web3",
  "Indépendants",
];

export default function Categories() {
  return (
    <section
      id="cas-usage"
      aria-labelledby="cas-usage-heading"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.25em] font-mono neon-gold">
          Cas d&apos;usage
        </p>
        <h2
          id="cas-usage-heading"
          className="font-syne mx-auto max-w-2xl text-2xl font-bold leading-snug text-balance text-white sm:text-3xl"
        >
          La même douleur. <span className="text-bt-cyan">Partout.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          Le Bon Coin, c&apos;est 28 millions d&apos;annonces — voitures, high-tech, mode, services,
          immobilier, logements. Les faux profils se multiplient dans chaque catégorie. Faux vendeur
          de téléphone, faux bailleur, faux acheteur de voiture, faux prestataire — le problème est le
          même partout.
        </p>
        <p className="mx-auto mt-3 max-w-2xl font-syne text-base font-semibold italic leading-snug text-white/90 sm:text-lg">
          Cette personne est-elle vraiment celle qu&apos;elle prétend être ?
        </p>
      </Reveal>

      <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6">
        {/* SANS BLOCKTRUST */}
        <Reveal className="flex flex-col rounded-2xl border border-red-500/25 bg-white/[0.02] p-6 backdrop-blur-sm">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
            Sans BLOCKTRUST
          </p>
          <ul className="space-y-2.5">
            {sansBlocktrust.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/60">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" strokeWidth={2.5} aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-start gap-2.5 border-t border-white/5 pt-4 text-sm leading-relaxed text-white/55">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f59e0b]" aria-hidden />
            <span>Pourtant : photo rassurante, prix attractif, nom crédible.</span>
          </p>
        </Reveal>

        {/* AVEC BLOCKTRUST */}
        <Reveal
          delay={150}
          className="flex flex-col rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-emerald-500/5 p-6 shadow-[0_0_40px_rgba(0,212,255,0.12)] backdrop-blur-sm"
        >
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-bt-cyan">
            Avec BLOCKTRUST
          </p>
          <ul className="space-y-2.5">
            {avecBlocktrust.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <Reveal delay={250} className="mx-auto mt-10 max-w-2xl text-center">
        <p className="text-sm leading-relaxed text-white/80 sm:text-base">
          Un profil certifié BLOCKTRUST se distingue immédiatement.{" "}
          <span className="font-semibold text-bt-cyan">
            Pas d&apos;affirmation de confiance — des preuves.
          </span>
        </p>
      </Reveal>

      <Reveal delay={300} className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        {verticales.map((v) => (
          <span
            key={v}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/65"
          >
            {v}
          </span>
        ))}
      </Reveal>
    </section>
  );
}
