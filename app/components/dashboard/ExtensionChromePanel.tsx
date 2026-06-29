"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
} from "lucide-react";
import ChromeIcon from "@/app/components/ui/ChromeIcon";
import {
  CHROME_EXTENSION_STORE_URL,
  isChromeExtensionStoreUrlReady,
} from "@/lib/chrome-extension";
import { EXTENSION_API_KEY_MASKED_DISPLAY } from "@/lib/extension-api-key";

export type ExtensionKeyInitial = {
  hasKey: boolean;
  masked: string | null;
  canReveal: boolean;
};

type ApiKeyResponse = {
  hasKey?: boolean;
  apiKey?: string | null;
  masked?: string | null;
  canReveal?: boolean;
  message?: string;
  error?: string;
};

type Props = {
  extensionKeyInitial: ExtensionKeyInitial;
};

const primaryBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/20 px-5 py-2.5 text-sm font-semibold text-bt-cyan transition hover:bg-bt-cyan/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

const secondaryBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

export default function ExtensionChromePanel({ extensionKeyInitial }: Props) {
  const [hasExtensionKey, setHasExtensionKey] = useState(extensionKeyInitial.hasKey);
  const [canReveal, setCanReveal] = useState(extensionKeyInitial.canReveal);
  const [keyLoading, setKeyLoading] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const storeReady = isChromeExtensionStoreUrlReady();

  async function handleCopyKey() {
    if (!canReveal) return;

    setKeyError(null);
    setCopyLoading(true);
    try {
      const res = await fetch("/api/extension/api-key", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal" }),
      });
      const data = (await res.json()) as ApiKeyResponse;
      if (!res.ok) {
        if (data.error === "legacy_key") {
          setCanReveal(false);
        }
        setKeyError(data.message ?? data.error ?? "Impossible de copier la clé.");
        return;
      }
      if (!data.apiKey) {
        setKeyError("Impossible de copier la clé.");
        return;
      }

      try {
        await navigator.clipboard.writeText(data.apiKey);
        setCopyDone(true);
        window.setTimeout(() => setCopyDone(false), 2000);
      } catch {
        setKeyError("Copie impossible — vérifiez les permissions du navigateur.");
      }
    } finally {
      setCopyLoading(false);
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
      if (data.apiKey || data.hasKey) {
        setHasExtensionKey(true);
        setCanReveal(true);
        return;
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
    setCopyDone(false);
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
        setHasExtensionKey(true);
        setCanReveal(true);
      }
    } finally {
      setKeyLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-bt-cyan/20 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/95 p-2">
            <ChromeIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                NOUVEAU — Disponible publiquement
              </span>
            </div>
            <h2 className="font-syne text-xl font-bold text-white sm:text-2xl">
              Extension Chrome BLOCKTRUST™
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Installez TrustScan depuis le Chrome Web Store, puis connectez votre clé API pour
              vérifier l&apos;identité de vos correspondants dans Gmail.
            </p>
          </div>
        </div>

        {storeReady ? (
          <a
            href={CHROME_EXTENSION_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-bt-cyan px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-bt-cyan/90 sm:w-auto"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            Installer l&apos;extension
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </a>
        ) : (
          <p className="text-sm text-white/45">
            L&apos;extension sera bientôt disponible sur le Chrome Web Store.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1f3c] p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-syne text-lg font-semibold text-white">Clé API extension</h2>
            <p className="mt-1 text-sm text-white/50">
              Cette clé lie les extensions Chrome et Outlook à votre compte BLOCKTRUST™. Tous les
              forfaits, y compris Découverte.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              hasExtensionKey
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border border-white/15 bg-white/5 text-white/55"
            }`}
          >
            {hasExtensionKey ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                Clé active
              </>
            ) : (
              <>
                <KeyRound className="h-3.5 w-3.5" aria-hidden />
                Aucune clé
              </>
            )}
          </span>
        </div>

        {keyError ? (
          <p className="mb-4 text-sm text-[#E05252]" role="alert">
            {keyError}
          </p>
        ) : null}

        {hasExtensionKey ? (
          <div className="mb-5 space-y-3">
            <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
              <code className="min-w-0 break-all font-mono text-xs text-white/70">
                {EXTENSION_API_KEY_MASKED_DISPLAY}
              </code>
              <div className="flex flex-col gap-3 sm:flex-row sm:shrink-0">
                <button
                  type="button"
                  onClick={() => void handleCopyKey()}
                  disabled={!canReveal || copyLoading || keyLoading}
                  className={primaryBtnClass}
                  title={canReveal ? undefined : "Régénérez la clé pour activer la copie sécurisée"}
                >
                  {copyDone ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                      Copiée !
                    </>
                  ) : copyLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Copie…
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden />
                      Copier la clé
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRegenerateKey()}
                  disabled={keyLoading || copyLoading}
                  className={secondaryBtnClass}
                >
                  {keyLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Régénération…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" aria-hidden />
                      Régénérer
                    </>
                  )}
                </button>
              </div>
            </div>
            {!canReveal ? (
              <p className="text-xs text-amber-300/90">
                Régénérez votre clé une dernière fois pour activer la copie sécurisée.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => void handleGenerateKey()}
              disabled={keyLoading}
              className={primaryBtnClass}
            >
              {keyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Génération…
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" aria-hidden />
                  Générer ma clé API
                </>
              )}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <h2 className="font-syne mb-4 text-base font-semibold text-white">
          Comment connecter l&apos;extension
        </h2>
        <ol className="space-y-3 text-sm leading-relaxed text-white/65">
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-bt-cyan">1</span>
            <span>
              Installez l&apos;extension BLOCKTRUST TrustScan depuis le{" "}
              <a
                href={CHROME_EXTENSION_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bt-cyan hover:underline"
              >
                Chrome Web Store
              </a>
              .
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs font-semibold text-bt-cyan">2</span>
            <span>Générez votre clé API ci-dessus, puis cliquez sur « Copier la clé ».</span>
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
