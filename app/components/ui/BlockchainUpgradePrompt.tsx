"use client";

import Link from "next/link";
import { ShieldCheck, ArrowRight, Link2 } from "lucide-react";

/**
 * Incitation à l'activation de la certification blockchain (plan gratuit Découverte).
 * Charte : navy #0a1628 / cyan #00d4ff / gold #BDA76B.
 */
export function BlockchainUpgradePrompt() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#BDA76B]/30 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-6 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[#BDA76B]/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[#00d4ff]/[0.05] blur-3xl"
      />

      <div className="relative z-10 flex items-start gap-4">
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#BDA76B]/30 bg-[#BDA76B]/15"
        >
          <ShieldCheck className="h-5 w-5 text-[#BDA76B]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-syne text-sm font-semibold text-white">
            Activez votre certification blockchain
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Votre badge est signé cryptographiquement mais{" "}
            <span className="font-medium text-white/80">
              n&apos;est pas encore ancré sur la blockchain Polygon
            </span>
            . L&apos;ancrage rend votre certificat infalsifiable et vérifiable on-chain à vie.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/15 px-4 py-2 text-xs font-semibold text-[#00d4ff] transition-all duration-200 hover:border-[#00d4ff]/60 hover:bg-[#00d4ff]/25"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          Activez votre certification blockchain à partir de 2,99€/mois
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
