"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Puzzle,
} from "lucide-react";
import {
  CHROME_EXTENSION_STORE_URL,
  isChromeExtensionStoreUrlReady,
} from "@/lib/chrome-extension";

export type ExtensionKeyInitial = {
  hasKey: boolean;
  masked: string | null;
};

type ApiKeyResponse = {
  hasKey?: boolean;
  apiKey?: string | null;
  masked?: string | null;
  message?: string;
  error?: string;
};

type Props = {
  extensionKeyInitial: ExtensionKeyInitial;
};

export default function ExtensionChromePanel({ extensionKeyInitial }: Props) {
  const [hasExtensionKey, setHasExtensionKey] = useState(extensionKeyInitial.hasKey);
  const [maskedKey, setMaskedKey] = useState<string | null>(extensionKeyInitial.masked);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const storeReady = isChromeExtensionStoreUrlReady();

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 1500);
    } catch {
      setKeyError("Copie impossible — copiez manuellement.");
    }
  }

  async function handleGenerateKey() {
    setKeyError(null);
    setKeyLoading(true);
    try {
      const res = await fetch("/api/extension/api-key", {
        method: "GET",
        credentials: "include",
      });
      const data = (await res.json()) as ApiKeyResponse;
      if (!res.ok) {
        setKeyError(data.message ?? data.error ?? "Erreur lors de la génération.");
        return;
      }
      if (data.apiKey) {
        setNewApiKey(data.apiKey);
        setHasExtensionKey(true);
        setMaskedKey(data.masked ?? null);
        return;
      }
      if (data.hasKey) {
        setHasExtensionKey(true);
        setMaskedKey(data.masked ?? null);
        setKeyError(
          data.message ??
            "Une clé existe déjà pour ce compte. Utilisez « Régénérer la clé » si vous devez en créer une nouvelle."
        );
      }
    } finally {
      setKeyLoading(false);
    }
  }

  async function handleRegenerateKey() {
    if (
      !window.confirm(
        "Régénérer la clé ? L'ancienne clé sera révoquée immédiatement et l'extension devra utiliser la nouvelle."
      )
    ) {
      return;
    }
    setKeyError(null);
    setNewApiKey(null);
    setKeyLoading(true);
    try {
      const res = await fetch("/api/extension/api-key", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate" }),
      });
      const data = (await res.json()) as ApiKeyResponse;
      if (!res.ok) {
        setKeyError(data.message ?? data.error ?? "Erreur lors de la régénération.");
        return;
      }
      if (data.apiKey) {
        setNewApiKey(data.apiKey);
        setHasExtensionKey(true);
        setMaskedKey(data.masked ?? null);
      }
    } finally {
      setKeyLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-bt-cyan/20 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bt-cyan/30 bg-bt-cyan/10">
            <Puzzle className="h-5 w-5 text-bt-cyan" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-syne text-xl font-bold text-white sm:text-2xl">
              Extension Chrome BLOCKTRUST™
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Connectez l&apos;extension à votre compte pour vérifier l&apos;identité de vos
              correspondants directement dans Gmail.
            </p>
          </div>
        </div>

        {storeReady ? (
          <a
            href={CHROME_EXTENSION_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-bt-cyan/40 hover:text-bt-cyan sm:w-auto"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            Installer l&apos;extension
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </a>
        ) : (
          <p className="text-sm text-white/45">
            L&apos;extension sera bientôt disponible sur le Chrome Web Store.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1f3c] p-4 sm:p-6">
        <h2 className="font-syne mb-1 text-lg font-semibold text-white">Clé API extension</h2>
        <p className="mb-5 text-sm text-white/50">
          Cette clé lie l&apos;extension Chrome à votre compte BLOCKTRUST™. Elle est stockée de
          façon sécurisée côté serveur — affichée en clair une seule fois à la génération.
        </p>

        {keyError ? (
          <p className="mb-4 text-sm text-[#E05252]" role="alert">
            {keyError}
          </p>
        ) : null}

        {!hasExtensionKey ? (
          <button
            type="button"
            onClick={() => void handleGenerateKey()}
            disabled={keyLoading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/20 px-5 py-2.5 text-sm font-semibold text-bt-cyan transition hover:bg-bt-cyan/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {keyLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Génération…
              </>
            ) : (
              "Générer ma clé API"
            )}
          </button>
        ) : null}

        {newApiKey ? (
          <div className="rounded-lg border border-amber-500/30 bg-black/25 p-4">
            <p className="mb-3 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Copiez cette clé maintenant — elle ne sera plus affichée intégralement.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-white/10 bg-[#0a1628] px-3 py-2.5 font-mono text-xs text-white/85">
                {newApiKey}
              </code>
              <button
                type="button"
                onClick={() => void copyToClipboard(newApiKey)}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-sm font-semibold text-bt-cyan transition hover:bg-bt-cyan/25"
              >
                {copyDone ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden />
                    Copier
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}

        {hasExtensionKey && !newApiKey ? (
          <div>
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 font-mono text-xs text-white/45">
                {maskedKey ?? "Clé active (masquée)"}
              </code>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Active
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleRegenerateKey()}
              disabled={keyLoading}
              className="text-sm text-white/45 transition hover:text-white/70 disabled:opacity-50"
            >
              {keyLoading ? "Régénération…" : "Régénérer la clé (révoque l'ancienne)"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="font-syne mb-4 text-base font-semibold text-white">
          Comment connecter l&apos;extension
        </h2>
        <ol className="space-y-3 text-sm leading-relaxed text-white/65">
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-bt-cyan">1</span>
            <span>
              Installez l&apos;extension BLOCKTRUST TrustScan depuis le Chrome Web Store (ou chargez
              le dossier <code className="text-white/80">extension/</code> en mode développeur).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-bt-cyan">2</span>
            <span>
              Générez votre clé API ci-dessus et copiez-la.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-bt-cyan">3</span>
            <span>
              Cliquez sur l&apos;icône puzzle BLOCKTRUST dans Chrome, collez la clé dans le champ
              prévu, puis cliquez sur <strong className="font-semibold text-white">Connecter</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-bt-cyan">4</span>
            <span>
              Ouvrez Gmail : les badges de confiance s&apos;affichent à côté des expéditeurs
              vérifiés.
            </span>
          </li>
        </ol>
        <p className="mt-4 text-xs text-white/40">
          Besoin d&apos;aide ? Consultez{" "}
          <Link href="/how-to" className="text-bt-cyan hover:underline">
            le guide BLOCKTRUST
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
