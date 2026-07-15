"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  UserPlus,
  Share2,
  ShieldCheck,
  Puzzle,
  Mail,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import TechTermTooltip, {
  HOW_TO_LEXICON_ENTRIES,
  TECH_TERM_DEFINITIONS,
} from "@/app/components/ui/TechTermTooltip";

type StepItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  duration: string;
  href?: string;
  linkLabel?: string;
};

const STEPS: StepItem[] = [
  {
    icon: UserPlus,
    title: "Créez votre badge",
    description:
      "Inscrivez-vous gratuitement. Votre identité est vérifiée, puis un badge certifié unique vous est attribué.",
    duration: "2 minutes",
  },
  {
    icon: Share2,
    title: "Partagez et signez",
    description:
      "Envoyez votre lien de vérification ou signez vos emails et documents. Vos interlocuteurs vérifient votre identité en un clic.",
    duration: "instantané",
  },
  {
    icon: ShieldCheck,
    title: "Vérifiez vos contacts",
    description:
      "Avant de répondre, signer ou payer — vérifiez l'identité de votre interlocuteur. L'extension Chrome le fait automatiquement dans Gmail.",
    duration: "1 clic",
  },
  {
    icon: Puzzle,
    title: "Protégez-vous dans Gmail",
    description:
      "Installez l'extension Chrome BLOCKTRUST™ TrustScan. Elle vérifie automatiquement l'identité de chaque expéditeur et détecte les signatures BIS — directement dans Gmail.",
    duration: "installation en 1 minute",
    href: "/auth/register?callbackUrl=%2Fdashboard%2Fextension",
    linkLabel: "Créer un compte pour installer →",
  },
];

type ProtectionLayer = {
  icon?: LucideIcon;
  title: string;
  body: ReactNode;
};

const PROTECTION_LAYERS: ProtectionLayer[] = [
  {
    title: "Votre identité est infalsifiable",
    body: (
      <>
        Votre badge est ancré sur un registre public et inaltérable (la{" "}
        <TechTermTooltip term="polygon">blockchain Polygon</TechTermTooltip>
        ). Personne ne peut le modifier, le copier ou l&apos;antidater.
      </>
    ),
  },
  {
    title: "Vos interactions sont signées",
    body: (
      <>
        Chaque email, document ou paiement que vous signez avec BLOCKTRUST™ est vérifié{" "}
        <TechTermTooltip term="cryptographique">cryptographiquement</TechTermTooltip>
        . Si votre boîte email est piratée, l&apos;attaquant ne peut pas imiter votre
        signature.
      </>
    ),
  },
  {
    title: "Votre réputation se construit",
    body: (
      <>
        Chaque vérification réussie, chaque contact certifié, chaque interaction signée
        enrichit votre profil de confiance. Un score objectif que vos interlocuteurs
        consultent avant d&apos;agir.
      </>
    ),
  },
  {
    icon: Mail,
    title: "Protection automatique dans Gmail",
    body: (
      <>
        L&apos;extension Chrome scanne vos emails en temps réel. Badge vert pour les contacts
        certifiés, alerte orange si un contact habitué à signer ne signe pas — signal de
        compromission potentielle.
      </>
    ),
  },
];

function StepCard({
  icon: Icon,
  title,
  description,
  duration,
  href,
  linkLabel,
}: StepItem) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-bt-cyan/10">
        <Icon className="h-6 w-6 text-bt-cyan" aria-hidden />
      </div>
      <h3 className="font-syne text-balance text-lg font-bold text-white">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">{description}</p>
      <p className="mt-4 font-mono text-xs uppercase tracking-wider text-gold">{duration}</p>
      {href && linkLabel ? (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-bt-cyan transition hover:text-[#21dfff]"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default function HowToContent() {
  const [openLexiconId, setOpenLexiconId] = useState<string | null>(
    HOW_TO_LEXICON_ENTRIES[0]?.id ?? null,
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
      {/* Section 1 — Header */}
      <header className="text-center">
        <h1 className="font-syne text-balance mx-auto max-w-3xl text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
          Comment fonctionne BLOCKTRUST™ ?
        </h1>
        <p className="text-balance mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white/65 sm:text-base">
          De la création de votre badge à la protection de vos échanges — tout se fait en
          quelques minutes.
        </p>
      </header>

      {/* Section 2 — En 4 étapes */}
      <section className="mt-16" aria-labelledby="steps-heading">
        <h2
          id="steps-heading"
          className="font-syne text-balance mx-auto mb-10 max-w-3xl text-center text-xl font-bold text-white sm:text-2xl"
        >
          En 4 étapes
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step) => (
            <StepCard key={step.title} {...step} />
          ))}
        </div>
      </section>

      {/* Section 3 — Ce qui vous protège */}
      <section className="mt-16" aria-labelledby="protection-heading">
        <h2
          id="protection-heading"
          className="font-syne text-balance mx-auto mb-10 max-w-3xl text-center text-xl font-bold text-white sm:text-2xl"
        >
          Ce qui rend BLOCKTRUST™ unique
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROTECTION_LAYERS.map((layer) => {
            const LayerIcon = layer.icon;
            return (
              <div
                key={layer.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                {LayerIcon ? (
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-bt-cyan/10">
                    <LayerIcon className="h-5 w-5 text-bt-cyan" aria-hidden />
                  </div>
                ) : null}
                <h3 className="font-syne text-balance text-base font-bold text-bt-cyan sm:text-lg">
                  {layer.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{layer.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 4 — Lexique */}
      <section className="mt-16" aria-labelledby="lexicon-heading">
        <h2
          id="lexicon-heading"
          className="font-syne text-balance mx-auto mb-8 max-w-3xl text-center text-xl font-bold text-white sm:text-2xl"
        >
          Les termes techniques en clair
        </h2>
        <ul className="space-y-3">
          {HOW_TO_LEXICON_ENTRIES.map((entry) => {
            const isOpen = openLexiconId === entry.id;
            const definition = TECH_TERM_DEFINITIONS[entry.term];
            return (
              <li
                key={entry.id}
                id={entry.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-bt-cyan/30"
              >
                <button
                  type="button"
                  onClick={() => setOpenLexiconId(isOpen ? null : entry.id)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-syne text-sm font-semibold text-white sm:text-base">
                    <TechTermTooltip term={entry.term}>{entry.label}</TechTermTooltip>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-bt-cyan transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
                {isOpen ? (
                  <div className="px-5 pb-4 pt-0 text-sm leading-relaxed text-white/65">
                    {definition}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Section 5 — CTA */}
      <section className="mt-16 text-center" aria-labelledby="cta-heading">
        <h2
          id="cta-heading"
          className="font-syne text-balance mx-auto max-w-3xl text-xl font-bold text-white sm:text-2xl"
        >
          Prêt à certifier votre identité ?
        </h2>
        <Link
          href="/auth/register"
          className="mt-6 inline-flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl bg-bt-cyan px-8 py-4 text-sm font-bold text-navy shadow-glow-cyan transition-all hover:scale-[1.02] hover:bg-[#21dfff] sm:text-base"
        >
          Commencer gratuitement
        </Link>
        <p className="mt-4 text-sm text-white/50">
          Plan Découverte gratuit, sans carte bancaire.
        </p>
      </section>
    </div>
  );
}
