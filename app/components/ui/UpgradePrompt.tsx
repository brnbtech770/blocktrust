"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export type UpgradePromptProps = {
  planName: string;
  currentLimit: number;
  nextPlanName: string;
  nextPlanLimit: number;
  nextPlanPrice: string;
  upgradeHref: string;
  /** Bandeau compact (ex. haut de liste certificats) au lieu de la carte pleine. */
  inline?: boolean;
};

export function UpgradePrompt({
  planName,
  currentLimit,
  nextPlanName,
  nextPlanLimit,
  nextPlanPrice,
  upgradeHref,
  inline = false,
}: UpgradePromptProps) {
  const certWord = currentLimit <= 1 ? "certificat" : "certificats";
  const nextWord = nextPlanLimit <= 1 ? "certificat" : "certificats";

  if (inline) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-[#BDA76B]/30 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-4 sm:p-5">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[#BDA76B]/10 blur-2xl"
        />

        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <div
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#BDA76B]/30 bg-[#BDA76B]/15"
          >
            <Sparkles className="h-5 w-5 text-[#BDA76B]" />
          </div>

          <p className="min-w-[200px] flex-1 text-sm leading-relaxed text-white/80">
            Forfait <span className="font-semibold text-white">{planName}</span> —{" "}
            <span className="text-white/60">
              {currentLimit} {certWord} inclus.
            </span>{" "}
            Passez à <span className="font-semibold text-white">{nextPlanName}</span> pour {nextPlanLimit} {nextWord}.
          </p>

          <Link
            href={upgradeHref}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#BDA76B]/40 bg-[#BDA76B]/20 px-4 py-2 text-xs font-semibold text-[#BDA76B] transition-all duration-200 hover:border-[#BDA76B]/60 hover:bg-[#BDA76B]/30"
          >
            {nextPlanPrice === "Voir les offres" ? "Voir les offres" : nextPlanPrice}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#BDA76B]/30 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-6 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[#BDA76B]/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[#00d4ff]/[0.04] blur-3xl"
      />

      <div className="relative z-10 flex items-start gap-4">
        <div
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#BDA76B]/30 bg-[#BDA76B]/15"
        >
          <Sparkles className="h-5 w-5 text-[#BDA76B]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-syne text-sm font-semibold text-white">
            Passez au plan supérieur
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Votre forfait{" "}
            <span className="font-medium text-white/80">{planName}</span> inclut{" "}
            {currentLimit} {certWord}.{" "}
            <span className="font-medium text-white/80">{nextPlanName}</span>{" "}
            débloque {nextPlanLimit} {nextWord}.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={upgradeHref}
          className="inline-flex items-center gap-2 rounded-lg border border-[#BDA76B]/40 bg-[#BDA76B]/20 px-4 py-2 text-xs font-semibold text-[#BDA76B] transition-all duration-200 hover:border-[#BDA76B]/60 hover:bg-[#BDA76B]/30"
        >
          {nextPlanPrice === "Voir les offres"
            ? "Voir les offres"
            : `${nextPlanName} — ${nextPlanPrice}`}
          <ArrowRight className="h-3 w-3" />
        </Link>

        <span className="text-xs text-white/30">
          Plan actuel : {planName}
        </span>
      </div>
    </div>
  );
}
