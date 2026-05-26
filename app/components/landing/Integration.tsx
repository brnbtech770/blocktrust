"use client";

import { useState } from "react";
import {
  Globe,
  Mail,
  Video,
  Code2,
  Copy,
  Check,
  type LucideIcon,
} from "lucide-react";
import Reveal from "./Reveal";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

type Tab = {
  id: string;
  icon: LucideIcon;
  label: string;
};

const tabs: Tab[] = [
  { id: "web", icon: Globe, label: "Site web" },
  { id: "email", icon: Mail, label: "Signature email" },
  { id: "visio", icon: Video, label: "Appels & visio" },
  { id: "api", icon: Code2, label: "API B2B" },
];

const SAMPLE_ID = "bt-7f3a92";

export default function Integration() {
  const [active, setActive] = useState<string>("web");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // ignore — clipboard non disponible
    }
  };

  const iframeSnippet = `<iframe
  src="https://blocktrust.tech/badge/${SAMPLE_ID}"
  width="220"
  height="280"
  style="border:0;background:transparent"
  loading="lazy"
></iframe>`;

  const apiSnippet = `GET https://blocktrust.tech/api/v2/verify/${SAMPLE_ID}

{
  "valid": true,
  "entity": "Acme Corp",
  "score": 85,
  "anchored_at": "2026-04-26T18:00:00Z"
}`;

  return (
    <section
      id="integration"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">
          Intégration
        </p>
        <h2 className="font-syne mx-auto max-w-2xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
          Intégrez votre badge <span className="text-bt-cyan">partout</span>
        </h2>
      </Reveal>

      <Reveal delay={120} className="mt-10">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Modes d'intégration"
          className="mx-auto flex w-full max-w-2xl flex-wrap justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${t.id}`}
                id={`tab-${t.id}`}
                onClick={() => setActive(t.id)}
                className={`flex min-h-[44px] flex-1 min-w-[120px] items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                  isActive
                    ? "bg-bt-cyan text-navy shadow-glow-cyan"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Panels */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-8">
          {/* WEB */}
          {active === "web" && (
            <div
              role="tabpanel"
              id="panel-web"
              aria-labelledby="tab-web"
              className="grid grid-cols-1 gap-6 animate-fade-in lg:grid-cols-2"
            >
              <div>
                <h3 className="font-syne mb-2 text-lg font-semibold text-white sm:text-xl">
                  Iframe à coller sur votre site
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-white/70">
                  Intégrez votre badge en moins de 30 secondes — aucune dépendance.
                </p>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg border border-white/10 bg-[#060e1a] p-4 text-xs leading-relaxed text-bt-cyan font-mono">
                    {iframeSnippet}
                  </pre>
                  <button
                    onClick={() => copy("web", iframeSnippet)}
                    className="absolute right-2 top-2 inline-flex min-h-[44px] items-center gap-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                  >
                    {copied === "web" ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copié
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copier
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Aperçu badge — vrai BlockTrustBadge animé, centré + agrandi */}
              <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center">
                <BlockTrustBadge
                  size={200}
                  instanceId="integration-preview"
                  showWatermark={false}
                  className="shrink-0"
                />
                <p className="mt-3 font-mono text-xs text-bt-cyan/60">
                  {SAMPLE_ID.toUpperCase()}
                </p>
              </div>
            </div>
          )}

          {/* EMAIL */}
          {active === "email" && (
            <div
              role="tabpanel"
              id="panel-email"
              aria-labelledby="tab-email"
              className="animate-fade-in"
            >
              <h3 className="font-syne mb-2 text-lg font-semibold text-white sm:text-xl">
                Ajoutez votre badge à votre signature email
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-white/70">
                Compatible Gmail, Outlook, Apple Mail. Aucun script requis.
              </p>
              <ol className="space-y-3">
                {[
                  "Ouvrez les paramètres de signature de votre client mail.",
                  "Collez le lien ou l'image fournie depuis votre dashboard BLOCKTRUST.",
                  "Vos contacts voient un badge cliquable qui prouve votre identité.",
                ].map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bt-cyan/15 font-syne text-sm font-bold text-bt-cyan">
                      {i + 1}
                    </span>
                    <span className="text-sm text-white/80">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* VISIO */}
          {active === "visio" && (
            <div
              role="tabpanel"
              id="panel-visio"
              aria-labelledby="tab-visio"
              className="animate-fade-in"
            >
              <h3 className="font-syne mb-2 text-lg font-semibold text-white sm:text-xl">
                Partagez votre lien avant chaque appel
              </h3>
              <p className="mb-6 text-sm leading-relaxed text-white/70">
                Compatible Microsoft Teams, Zoom, Google Meet — partagez simplement votre URL de
                vérification.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="flex-1 overflow-x-auto rounded-lg border border-white/10 bg-[#060e1a] px-4 py-3 text-xs text-bt-cyan font-mono sm:text-sm">
                  blocktrust.tech/verify/{SAMPLE_ID}
                </code>
                <button
                  onClick={() =>
                    copy("visio", `https://blocktrust.tech/verify/${SAMPLE_ID}`)
                  }
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-medium text-white hover:bg-white/5 sm:w-auto"
                >
                  {copied === "visio" ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copier le lien
                    </>
                  )}
                </button>
              </div>
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {["Microsoft Teams", "Zoom", "Google Meet"].map((p) => (
                  <li
                    key={p}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-medium text-white/80"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* API */}
          {active === "api" && (
            <div
              role="tabpanel"
              id="panel-api"
              aria-labelledby="tab-api"
              className="animate-fade-in"
            >
              <h3 className="font-syne mb-2 text-lg font-semibold text-white sm:text-xl">
                API REST pour vos systèmes B2B
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-white/70">
                Vérifiez l&apos;identité d&apos;un partenaire en un appel HTTP. Réponse
                JSON structurée et signée.
              </p>
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg border border-white/10 bg-[#060e1a] p-4 text-xs leading-relaxed text-bt-cyan font-mono">
                  {apiSnippet}
                </pre>
                <button
                  onClick={() => copy("api", apiSnippet)}
                  className="absolute right-2 top-2 inline-flex min-h-[44px] items-center gap-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                >
                  {copied === "api" ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copier
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </section>
  );
}
