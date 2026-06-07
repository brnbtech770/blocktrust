"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import {
  CHROME_EXTENSION_STORE_URL,
  isChromeExtensionStoreUrlReady,
  TRUSTSCAN_BANNER_DISMISS_KEY,
  TRUSTSCAN_DOM_ATTR,
} from "@/lib/chrome-extension";

function isTrustScanExtensionPresent(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute(TRUSTSCAN_DOM_ATTR) === "installed";
}

export default function ChromeExtensionBanner() {
  const [visible, setVisible] = useState(false);
  const storeReady = isChromeExtensionStoreUrlReady();

  useEffect(() => {
    if (localStorage.getItem(TRUSTSCAN_BANNER_DISMISS_KEY) === "1") {
      return;
    }
    if (isTrustScanExtensionPresent()) {
      return;
    }

    setVisible(true);

    const poll = window.setInterval(() => {
      if (isTrustScanExtensionPresent()) {
        setVisible(false);
        window.clearInterval(poll);
      }
    }, 400);

    const stop = window.setTimeout(() => window.clearInterval(poll), 4000);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(TRUSTSCAN_BANNER_DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const ctaClass =
    "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-bt-cyan px-5 py-2.5 font-sans text-sm font-semibold text-navy transition hover:bg-bt-cyan/90 sm:w-auto";

  return (
    <div
      className="relative mb-6 overflow-hidden rounded-xl border border-bt-cyan/25 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-4 sm:p-5"
      role="region"
      aria-label="Extension Chrome BLOCKTRUST TrustScan"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-bt-cyan/10 blur-2xl"
        aria-hidden
      />
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"
        aria-label="Masquer cette bannière"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex flex-col gap-4 pr-8 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bt-cyan/30 bg-bt-cyan/10">
          <Download className="h-5 w-5 text-bt-cyan" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-syne text-base font-semibold text-white sm:text-lg">
            Protégez-vous directement dans Gmail
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-white/65">
            L&apos;extension BLOCKTRUST™ vérifie l&apos;identité de vos correspondants en
            temps réel, directement dans votre boîte mail.
          </p>
        </div>
        <div className="shrink-0 sm:self-center">
          {storeReady ? (
            <a
              href={CHROME_EXTENSION_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={ctaClass}
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              Installer l&apos;extension
            </a>
          ) : (
            <span
              className={`${ctaClass} cursor-not-allowed opacity-55`}
              title="Bientôt disponible sur le Chrome Web Store"
              aria-disabled="true"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              Installer l&apos;extension
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
