"use client";

import { Copy, ExternalLink, Mail } from "lucide-react";
import { useState } from "react";

const OUTLOOK_MANIFEST_URL = "https://blocktrust.tech/outlook/manifest.json";

export default function ExtensionOutlookPanel() {
  const [copied, setCopied] = useState(false);

  async function copyManifestUrl() {
    try {
      await navigator.clipboard.writeText(OUTLOOK_MANIFEST_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* fail-soft */
    }
  }

  return (
    <section className="rounded-xl border border-[#BDA76B]/20 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#BDA76B]/30 bg-[#BDA76B]/10">
          <Mail className="h-5 w-5 text-[#BDA76B]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-syne text-xl font-bold text-white sm:text-2xl">
            Extension Outlook BLOCKTRUST™
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            Vérifiez l&apos;identité de vos correspondants dans Outlook. La même clé API que
            l&apos;extension Chrome fonctionne pour les deux.
          </p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/5 p-3 text-sm leading-relaxed text-white/75">
        L&apos;extension Outlook est en phase de test. Pour une expérience optimale, nous
        recommandons l&apos;extension Chrome avec Gmail.
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a
          href="https://outlook.office.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[#BDA76B]/40 bg-[#BDA76B]/15 px-4 py-2.5 text-sm font-semibold text-[#BDA76B] transition hover:bg-[#BDA76B]/25 sm:w-auto"
        >
          Ouvrir Outlook Web
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </a>
        <button
          type="button"
          onClick={() => void copyManifestUrl()}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#BDA76B]/40 hover:text-[#BDA76B] sm:w-auto"
        >
          <Copy className="h-4 w-4 shrink-0" aria-hidden />
          {copied ? "URL copiée" : "Copier l'URL du manifest"}
        </button>
      </div>

      <p className="mt-4 text-xs text-white/40">
        URL du manifest :{" "}
        <code className="break-all rounded bg-[#0a1628] px-1.5 py-0.5 font-mono text-[11px] text-[#00d4ff]">
          {OUTLOOK_MANIFEST_URL}
        </code>
      </p>

      <div className="mt-5 space-y-4">
        <div className="rounded-lg border border-[#00d4ff]/25 bg-black/20 p-4">
          <h3 className="font-syne text-sm font-semibold text-[#00d4ff]">
            Outlook Web — recommandé
          </h3>
          <p className="mt-1 text-xs text-white/45">
            outlook.office.com · outlook.live.com
          </p>
          <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-white/65">
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">1</span>
              <span>Ouvrez Outlook Web (outlook.office.com ou outlook.live.com).</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">2</span>
              <span>
                Cliquez sur « … » (Plus d&apos;options) dans la barre de lecture d&apos;un email.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">3</span>
              <span>« Obtenir des compléments » ou « Get Add-ins ».</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">4</span>
              <span>
                Cherchez « BLOCKTRUST » ou ouvrez « Mes compléments ». Si non trouvé : «
                Compléments personnalisés » → « Ajouter depuis une URL ».
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">5</span>
              <span>
                Collez l&apos;URL du manifest, puis connectez votre clé API dans l&apos;add-in.
              </span>
            </li>
          </ol>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h3 className="font-syne text-sm font-semibold text-white">Outlook Mac (app native)</h3>
          <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-white/65">
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">1</span>
              <span>Ouvrez un email dans l&apos;application Outlook.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">2</span>
              <span>Menu « … » → « Obtenir des compléments » ou « Get Add-ins ».</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">3</span>
              <span>
                Si le menu n&apos;apparaît pas : Outlook Mac ne supporte les add-ins que sur les
                comptes Microsoft 365 (pas IMAP/Gmail). Utilisez Outlook Web à la place.
              </span>
            </li>
          </ol>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h3 className="font-syne text-sm font-semibold text-white">Outlook Windows</h3>
          <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-white/65">
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">1</span>
              <span>Fichier → Gérer les compléments.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">2</span>
              <span>« Mes compléments » → « Compléments personnalisés ».</span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-xs font-semibold text-[#BDA76B]">3</span>
              <span>
                « Ajouter depuis une URL » → collez l&apos;URL du manifest BLOCKTRUST™.
              </span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
