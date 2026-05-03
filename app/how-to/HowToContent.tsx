"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  UserPlus,
  ShieldCheck,
  Link2,
  QrCode,
  Globe,
  ScanLine,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Mail,
  Video,
  Code2,
  Palette,
  Building2,
  User,
} from "lucide-react";
import Reveal from "@/app/components/landing/Reveal";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

type Audience = "particuliers" | "entreprises";

/* ======================================================================
   Cadre fenêtre navigateur simulé (réutilisable)
   ====================================================================== */
function BrowserFrame({
  url,
  children,
  className = "",
}: {
  url: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div
            className="max-w-full truncate rounded-md bg-white/5 px-3 py-1 font-mono text-[10px] text-white/55 sm:text-[11px]"
            style={{ minWidth: "min(320px, 80%)" }}
          >
            {url}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

/* ======================================================================
   Section 1 — Hero + Tabs
   ====================================================================== */
function Hero({
  audience,
  setAudience,
}: {
  audience: Audience;
  setAudience: (a: Audience) => void;
}) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pb-12 sm:pt-16 lg:px-8">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">
          Guide complet
        </p>
        <h1 className="font-syne mx-auto max-w-3xl pb-2 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Comment utiliser <span className="text-bt-cyan">BLOCKTRUST</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          Guide complet pour particuliers et entreprises — schéma de vérification,
          démos d&apos;intégration et FAQ.
        </p>
      </Reveal>

      <Reveal
        delay={150}
        className="mx-auto mt-8 flex max-w-md items-center justify-center rounded-xl border border-white/10 bg-white/5 p-1"
      >
        {(
          [
            { id: "particuliers", label: "Particuliers", icon: User },
            { id: "entreprises", label: "Entreprises", icon: Building2 },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const active = audience === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setAudience(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                active
                  ? "bg-bt-cyan text-navy shadow-glow-cyan"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </Reveal>
    </section>
  );
}

/* ======================================================================
   Section 2 — Schéma de vérification (8 étapes)
   ====================================================================== */
type FlowStep = {
  icon: typeof UserPlus;
  label: string;
  hint: string;
  tone: "cyan" | "gold" | "danger" | "valid";
};

const FLOW_STEPS: FlowStep[] = [
  { icon: UserPlus, label: "Émetteur", hint: "Profil + identité", tone: "cyan" },
  { icon: ShieldCheck, label: "BLOCKTRUST", hint: "Signe ES256 + SHA-256", tone: "cyan" },
  { icon: Link2, label: "Polygon", hint: "Ancrage blockchain", tone: "gold" },
  { icon: QrCode, label: "Badge", hint: "QR rotatif généré", tone: "cyan" },
  { icon: Globe, label: "Intégration", hint: "Site / Email / API", tone: "cyan" },
  { icon: ScanLine, label: "Vérificateur", hint: "Scanne le QR", tone: "cyan" },
  { icon: ShieldCheck, label: "BLOCKTRUST", hint: "Vérifie en temps réel", tone: "cyan" },
  { icon: CheckCircle2, label: "Verdict", hint: "VALID ✓ ou FRAUD ✗", tone: "valid" },
];

function toneClasses(tone: FlowStep["tone"]) {
  switch (tone) {
    case "gold":
      return {
        ring: "border-gold/50",
        glow: "rgba(189,167,107,0.45)",
        icon: "text-gold",
        bg: "bg-gold/10",
      };
    case "valid":
      return {
        ring: "border-emerald-400/55",
        glow: "rgba(29,184,126,0.5)",
        icon: "text-emerald-300",
        bg: "bg-emerald-400/10",
      };
    case "danger":
      return {
        ring: "border-red-400/50",
        glow: "rgba(224,82,82,0.45)",
        icon: "text-red-300",
        bg: "bg-red-400/10",
      };
    default:
      return {
        ring: "border-bt-cyan/50",
        glow: "rgba(0,212,255,0.45)",
        icon: "text-bt-cyan",
        bg: "bg-bt-cyan/10",
      };
  }
}

function VerificationFlow() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <Reveal className="mx-auto max-w-5xl text-center overflow-visible">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">
          Schéma technique
        </p>
        <h2 className="font-syne mx-auto pb-2 text-2xl font-semibold leading-tight text-white sm:text-3xl lg:text-4xl">
          Comment fonctionne la <span className="text-bt-cyan">vérification</span> ?
        </h2>
        <p className="mx-auto mt-4 text-sm leading-relaxed text-gold sm:text-base lg:whitespace-nowrap">
          De l&apos;émetteur au verdict — chaque étape est cryptographique, traçable et ancrée sur Polygon.
        </p>
      </Reveal>

      <div className="mt-12">
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((step, i) => {
            const t = toneClasses(step.tone);
            const Icon = step.icon;
            const isLast = i === FLOW_STEPS.length - 1;
            return (
              <Reveal
                as="li"
                key={`${step.label}-${i}`}
                delay={80 * i}
                className="relative"
              >
                <div
                  className={`flex h-full items-start gap-3 rounded-xl border ${t.ring} ${t.bg} p-4 transition-all hover:-translate-y-0.5`}
                  style={{ boxShadow: `0 0 24px ${t.glow}` }}
                >
                  <div
                    className={`howto-pulse-node flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${t.ring} bg-navy/80`}
                  >
                    <Icon className={`h-5 w-5 ${t.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                      Étape {i + 1}
                    </div>
                    <div className="font-syne mt-0.5 text-sm font-bold text-white">
                      {step.label}
                    </div>
                    <div className="mt-1 text-xs text-white/65">{step.hint}</div>
                  </div>
                </div>
                {!isLast && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-[-10px] top-1/2 hidden h-px w-5 -translate-y-1/2 lg:block"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(0,212,255,0.6), rgba(0,212,255,0))",
                    }}
                  />
                )}
              </Reveal>
            );
          })}
        </ol>

        <Reveal delay={300} className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            VALID — signature et ancrage vérifiés
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 text-red-300">
            <XCircle className="h-3.5 w-3.5" />
            FRAUD — copie ou altération détectée
          </span>
        </Reveal>
      </div>
    </section>
  );
}

/* ======================================================================
   Section 3 — Démos Particuliers
   ====================================================================== */
function ParticulierDemoCreate() {
  return (
    <BrowserFrame url="https://blocktrust.tech/dashboard/create" className="h-full">
      <div className="space-y-3 text-sm">
        <div
          className="howto-line-in rounded-lg border border-white/10 bg-white/5 p-3"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40">Étape 1</div>
          <div className="mt-1 font-mono text-xs text-white/80">olivier@example.com</div>
        </div>
        <div
          className="howto-line-in rounded-lg border border-white/10 bg-white/5 p-3"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40">Étape 2 — Vérification d&apos;identité</div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-16 items-center justify-center rounded border border-bt-cyan/30 bg-bt-cyan/5">
              <span className="font-mono text-[9px] text-bt-cyan">ID CARD</span>
            </div>
            <div className="flex-1 text-xs text-white/65">
              Pièce d&apos;identité validée
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Vérifié
              </span>
            </div>
          </div>
        </div>
        <div
          className="howto-line-in flex flex-col items-center gap-2 rounded-lg border border-bt-cyan/30 bg-bt-cyan/5 p-4"
          style={{ animationDelay: "0.9s" }}
        >
          <div className="text-[10px] uppercase tracking-wider text-bt-cyan">Étape 3 — Badge généré</div>
          <div className="howto-pop mx-auto">
            <BlockTrustBadge size={80} instanceId="howto-create" />
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ParticulierDemoIntegrate() {
  return (
    <BrowserFrame url="https://cabinet-martin.fr" className="h-full">
      <div className="relative min-h-[220px]">
        {/* Header du site fictif */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <div className="font-syne text-sm font-bold text-white">Cabinet Martin & Associés</div>
            <div className="text-[10px] text-white/40">Avocats au Barreau de Paris</div>
          </div>
          <div className="relative shrink-0">
            <div className="howto-pulse-node rounded-full">
              <BlockTrustBadge size={56} instanceId="howto-integrate" />
            </div>
            {/* Tooltip animé */}
            <div className="howto-tooltip pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-md border border-bt-cyan/40 bg-navy/95 px-3 py-1.5 text-[10px] font-medium text-bt-cyan shadow-glow-cyan">
              Identité vérifiée par BLOCKTRUST
            </div>
          </div>
        </div>

        {/* Contenu fictif (lignes lorem) */}
        <div className="mt-5 space-y-2.5">
          <div className="h-2.5 w-3/4 rounded bg-white/10" />
          <div className="h-2.5 w-full rounded bg-white/10" />
          <div className="h-2.5 w-2/3 rounded bg-white/10" />
          <div className="h-2.5 w-5/6 rounded bg-white/10" />
        </div>

        <div className="mt-5 flex gap-2">
          <div className="h-7 w-24 rounded bg-bt-cyan/20" />
          <div className="h-7 w-20 rounded border border-white/10 bg-white/5" />
        </div>

        {/* Curseur animé */}
        <div
          aria-hidden
          className="howto-cursor pointer-events-none absolute left-2 top-12"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 2 L3 18 L8 14 L11 21 L13 20 L10 13 L17 13 Z"
              fill="white"
              stroke="#0a1628"
              strokeWidth="1.2"
            />
          </svg>
        </div>
      </div>
    </BrowserFrame>
  );
}

function ParticulierDemoCall() {
  return (
    <BrowserFrame url="teams.microsoft.com — Réunion" className="h-full">
      <div className="space-y-3">
        <div className="rounded-lg bg-white/[0.04] p-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
            Olivier B. · 14:32
          </div>
          <div className="text-xs text-white/80">Bonjour, ravi de vous rencontrer en visio.</div>
        </div>

        <div
          className="howto-line-in rounded-lg border border-bt-cyan/30 bg-bt-cyan/5 p-3"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
            Olivier B. · 14:32
          </div>
          <div className="break-all font-mono text-[11px] text-bt-cyan">
            Voici mon badge BLOCKTRUST :
            <br />
            blocktrust.tech/verify/bt-7f3a92
          </div>
        </div>

        <div
          className="howto-line-in flex items-center gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-3"
          style={{ animationDelay: "0.9s" }}
        >
          <div className="howto-pop shrink-0">
            <BlockTrustBadge size={56} instanceId="howto-call" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-syne text-sm font-bold text-white">Olivier Bernabé</div>
            <div className="text-[11px] text-emerald-300">
              <CheckCircle2 className="mr-1 inline h-3 w-3" />
              Identité vérifiée — TrustScore 92/100
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ======================================================================
   Section 4 — Démos Entreprises
   ====================================================================== */
function EntrepriseDemoApi() {
  return (
    <BrowserFrame url="terminal — bash" className="h-full">
      <div className="rounded-md bg-[#060e1a] p-4 font-mono text-[11px] leading-relaxed sm:text-xs">
        <div className="text-emerald-300">
          <span className="text-white/50">$</span>{" "}
          <span className="howto-typing inline-block max-w-full align-bottom">
            curl https://blocktrust.tech/api/v2/verify/bt-7f3a92 \
          </span>
        </div>
        <div className="mt-1 pl-4 text-white/70">-H &quot;Authorization: Bearer YOUR_API_KEY&quot;</div>

        <div className="mt-3 space-y-0.5 text-bt-cyan">
          <div className="howto-line-in" style={{ animationDelay: "2.6s" }}>
            <span className="text-white/50">{"{"}</span>
          </div>
          <div className="howto-line-in pl-4" style={{ animationDelay: "2.8s" }}>
            <span className="text-white/55">&quot;valid&quot;:</span>{" "}
            <span className="text-emerald-300">true</span>,
          </div>
          <div className="howto-line-in pl-4" style={{ animationDelay: "3.0s" }}>
            <span className="text-white/55">&quot;entity&quot;:</span>{" "}
            <span className="text-amber-200">&quot;Cabinet Martin & Associés&quot;</span>,
          </div>
          <div className="howto-line-in pl-4" style={{ animationDelay: "3.2s" }}>
            <span className="text-white/55">&quot;trustScore&quot;:</span>{" "}
            <span className="text-amber-200">85</span>,
          </div>
          <div className="howto-line-in pl-4" style={{ animationDelay: "3.4s" }}>
            <span className="text-white/55">&quot;kycVerified&quot;:</span>{" "}
            <span className="text-emerald-300">true</span>,
          </div>
          <div className="howto-line-in pl-4" style={{ animationDelay: "3.6s" }}>
            <span className="text-white/55">&quot;blockchain&quot;:</span>{" "}
            <span className="text-amber-200">&quot;Polygon&quot;</span>,
          </div>
          <div className="howto-line-in pl-4" style={{ animationDelay: "3.8s" }}>
            <span className="text-white/55">&quot;timestamp&quot;:</span>{" "}
            <span className="text-amber-200">&quot;2026-04-27T10:00:00Z&quot;</span>
          </div>
          <div className="howto-line-in" style={{ animationDelay: "4.0s" }}>
            <span className="text-white/50">{"}"}</span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function EntrepriseDemoWhiteLabel() {
  return (
    <BrowserFrame url="https://partner-corp.com/verify" className="h-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="font-syne text-sm font-bold text-white">PARTNER CORP</div>
          <div className="rounded bg-[#dc2626]/15 px-2 py-0.5 text-[10px] font-bold text-[#dc2626]">
            VERIFIED PARTNER
          </div>
        </div>

        <div
          className="howto-line-in flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-[#dc2626] bg-[#dc2626]/10">
            <ShieldCheck className="h-6 w-6 text-[#dc2626]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-syne text-sm font-bold text-white">Identité vérifiée</div>
            <div className="text-[11px] text-white/60">Couleurs personnalisées — marque blanche</div>
          </div>
        </div>

        <div
          className="howto-line-in flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-2 text-[10px] text-white/50"
          style={{ animationDelay: "0.6s" }}
        >
          <span>Powered by</span>
          <span className="font-syne font-bold tracking-wider text-bt-cyan">BLOCKTRUST</span>
        </div>

        <p className="howto-line-in text-xs leading-relaxed text-white/65" style={{ animationDelay: "0.9s" }}>
          Intégrez la confiance <span className="text-bt-cyan">BLOCKTRUST</span> à votre
          marque — aux couleurs et au logo de votre entreprise.
        </p>
      </div>
    </BrowserFrame>
  );
}

function EntrepriseDemoSdk() {
  const installCmd = "npm install @blocktrust/sdk";
  const sdkSnippet = `import { BlockTrust } from '@blocktrust/sdk'

const bt = new BlockTrust({ apiKey: 'YOUR_KEY' })
const result = await bt.verify('CERTIFICATE_ID')`;

  return (
    <BrowserFrame url="VS Code — index.ts" className="h-full">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">Installation</span>
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
            Bientôt disponible
          </span>
        </div>

        <pre className="rounded-md border border-white/10 bg-[#060e1a] p-3 font-mono text-xs text-emerald-300">
          <span className="text-white/50">$ </span>
          {installCmd}
        </pre>

        <pre className="overflow-x-auto rounded-md border border-white/10 bg-[#060e1a] p-3 font-mono text-[11px] leading-relaxed text-bt-cyan">
          {sdkSnippet}
        </pre>

        <p className="text-xs text-white/65">
          SDK officiel pour Node.js, React, Vue et Python — typé TypeScript, zéro
          dépendance lourde.
        </p>
      </div>
    </BrowserFrame>
  );
}

/* ======================================================================
   Section Guide Particuliers / Entreprises
   ====================================================================== */
function GuideParticuliers() {
  const cards = [
    {
      title: "Créer votre badge",
      icon: UserPlus,
      desc: "Inscription, vérification d'identité sécurisée en 2 minutes, badge généré aussitôt.",
      demo: <ParticulierDemoCreate />,
    },
    {
      title: "Intégrer votre badge",
      icon: Globe,
      desc: "Iframe, image, lien — votre badge cliquable visible sur votre site personnel.",
      demo: <ParticulierDemoIntegrate />,
    },
    {
      title: "Partager avant un appel",
      icon: Video,
      desc: "Collez le lien dans Teams, Zoom ou WhatsApp — identité prouvée avant la réunion.",
      demo: <ParticulierDemoCall />,
    },
  ];

  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Reveal className="mx-auto max-w-3xl text-center overflow-visible">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">
          Guide particuliers
        </p>
        <h2 className="font-syne pb-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
          3 étapes pour démarrer
        </h2>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal
              key={c.title}
              delay={120 * i}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-bt-cyan/30 bg-bt-cyan/10">
                  <Icon className="h-5 w-5 text-bt-cyan" />
                </div>
                <h3 className="font-syne text-base font-semibold text-white sm:text-lg">{c.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-white/65">{c.desc}</p>
              <div className="mt-auto">{c.demo}</div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function GuideEntreprises() {
  const cards = [
    {
      title: "API B2B",
      icon: Code2,
      desc: "Endpoint REST authentifié — vérifiez n'importe quel certificat depuis votre back-office.",
      demo: <EntrepriseDemoApi />,
    },
    {
      title: "Marque blanche",
      icon: Palette,
      desc: "Badge aux couleurs de votre entreprise, mention « Powered by BLOCKTRUST » discrète.",
      demo: <EntrepriseDemoWhiteLabel />,
    },
    {
      title: "SDK officiel",
      icon: Code2,
      desc: "Installation npm, typage TypeScript — intégrez BLOCKTRUST en quelques lignes.",
      demo: <EntrepriseDemoSdk />,
    },
  ];

  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Reveal className="mx-auto max-w-3xl text-center overflow-visible">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] neon-gold">
          Guide entreprises
        </p>
        <h2 className="font-syne pb-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
          Intégrez la confiance à votre stack
        </h2>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal
              key={c.title}
              delay={120 * i}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="font-syne text-base font-semibold text-white sm:text-lg">{c.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-white/65">{c.desc}</p>
              <div className="mt-auto">{c.demo}</div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ======================================================================
   Section 5 — FAQ
   ====================================================================== */
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Combien de temps prend la vérification ?",
    a: "Instantanée — moins de 2 secondes. Le verdict s'affiche en temps réel sur la page de vérification.",
  },
  {
    q: "Comment fonctionne le badge ?",
    a: "Quand vous créez un badge BLOCKTRUST, nous générons une empreinte unique de votre identité — comme une signature manuscrite, mais impossible à copier ou falsifier. Cette empreinte est enregistrée de façon permanente sur la blockchain Polygon, une base de données publique et immuable. En 1 scan de votre QR code, n'importe qui peut vérifier en temps réel que c'est bien vous — sans application, sans compte, sans friction.",
  },
  {
    q: "Est-ce que mon badge peut être copié ?",
    a: "Non — le QR code est rotatif et invalide après chaque scan. Chaque certificat est ancré sur la blockchain Polygon, ce qui rend toute falsification cryptographiquement détectable.",
  },
  {
    q: "Quels documents pour la vérification ?",
    a: "Particulier : pièce d'identité (CNI ou passeport) + selfie. Entreprise : Kbis + SIRET + pièce du dirigeant. Vérification automatique via Stripe Identity et l'API INSEE Sirene.",
  },
  {
    q: "Puis-je intégrer le badge sur mon site ?",
    a: "Oui — iframe, script embed, image avec lien ou API REST. Compatible avec WordPress, Shopify, Webflow et tous les frameworks (React, Vue, Next.js, etc.).",
  },
  {
    q: "Le badge fonctionne-t-il sur mobile ?",
    a: "Oui — entièrement responsive, compatible iOS et Android. Le QR code est scannable depuis n'importe quel smartphone, sans application dédiée.",
  },
  {
    q: "Comment fonctionne la marque blanche ?",
    a: "Contactez-nous à commercial@blocktrust.tech pour une démo personnalisée. La marque blanche est incluse dans les forfaits Business et Enterprise.",
  },
];

function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="relative z-10 mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <Reveal className="text-center overflow-visible">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">FAQ</p>
        <h2 className="font-syne pb-2 text-2xl font-semibold leading-tight text-white sm:text-3xl">
          Questions fréquentes
        </h2>
      </Reveal>

      <ul className="mt-10 space-y-3">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <Reveal
              as="li"
              key={item.q}
              delay={60 * i}
              className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-bt-cyan/40"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-syne text-sm font-semibold text-white sm:text-base">
                  {item.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-bt-cyan transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-0 text-sm leading-relaxed text-white/70">{item.a}</div>
              )}
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

/* ======================================================================
   Section 6 — CTA final
   ====================================================================== */
function HowToFinalCTA() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 lg:px-8">
      <Reveal className="relative overflow-visible rounded-3xl border border-bt-cyan/25 p-8 text-center sm:p-12 lg:p-14">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(10,22,40,0.95) 0%, rgba(0,212,255,0.18) 100%)",
          }}
        />
        <div className="mx-auto flex justify-center">
          <BlockTrustBadge size={100} instanceId="howto-final-cta" />
        </div>
        <h2 className="font-syne mx-auto mt-6 max-w-2xl pb-4 text-2xl font-semibold leading-normal text-white sm:text-3xl lg:text-4xl">
          Prêt à protéger votre <span className="text-bt-cyan">identité digitale&nbsp;?</span>
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/auth/register"
            className="inline-flex w-full items-center justify-center rounded-xl bg-bt-cyan px-8 py-4 text-sm font-bold text-navy shadow-glow-cyan transition-all hover:scale-[1.04] hover:bg-[#21dfff] sm:w-auto sm:text-base"
          >
            Créer mon badge
          </Link>
          <a
            href="mailto:commercial@blocktrust.tech"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 sm:w-auto sm:text-base"
          >
            <Mail className="h-4 w-4" />
            Contacter l&apos;équipe
          </a>
        </div>
      </Reveal>
    </section>
  );
}

/* ======================================================================
   Composant racine — gère l'audience tab
   ====================================================================== */
export default function HowToContent() {
  const [audience, setAudience] = useState<Audience>("particuliers");

  return (
    <main>
      <Hero audience={audience} setAudience={setAudience} />
      <VerificationFlow />
      {audience === "particuliers" ? <GuideParticuliers /> : <GuideEntreprises />}
      <FaqAccordion />
      <HowToFinalCTA />
    </main>
  );
}
