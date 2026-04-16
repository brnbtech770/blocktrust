"use client";

import Link from "next/link";
import { Shield, Star } from "lucide-react";

export type UpgradePromptProps = {
  planName: string;
  currentLimit: number;
  nextPlanName: string;
  nextPlanLimit: number;
  nextPlanPrice: string;
  upgradeHref: string;
  /** Une ligne + CTA (ex. haut de liste certificats) */
  inline?: boolean;
};

const NAVY = "#0a1628";
const GOLD = "#BDA76B";
const CYAN = "#00d4ff";

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
      <div
        className="rounded-xl border px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ background: NAVY, borderColor: GOLD }}
      >
        <div className="relative shrink-0" aria-hidden>
          <Shield className="w-8 h-8" strokeWidth={1.25} style={{ color: GOLD }} />
          <Star
            className="w-3.5 h-3.5 absolute -bottom-0.5 -right-0.5"
            strokeWidth={2}
            fill={CYAN}
            stroke={NAVY}
          />
        </div>
        <p
          className="text-sm text-white/90 flex-1 min-w-[200px]"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
        >
          Forfait <strong className="text-white">{planName}</strong> : jusqu’à{" "}
          <strong className="text-white">{currentLimit}</strong> {certWord}. Passez à{" "}
          <strong className="text-white">{nextPlanName}</strong> pour jusqu’à{" "}
          <strong className="text-white">{nextPlanLimit}</strong> {nextWord}.
        </p>
        <Link
          href={upgradeHref}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 shrink-0"
          style={{ background: CYAN, color: NAVY }}
        >
          Passer à {nextPlanName} — {nextPlanPrice}
        </Link>
        <Link
          href="/dashboard"
          className="text-xs text-white/50 hover:text-white/70 underline-offset-2 hover:underline shrink-0"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
        >
          Retour au dashboard
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-6 shadow-lg"
      style={{ background: NAVY, borderColor: GOLD }}
    >
      <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
        <div className="relative shrink-0" aria-hidden>
          <Shield className="w-12 h-12 sm:w-14 sm:h-14" strokeWidth={1.25} style={{ color: GOLD }} />
          <Star
            className="w-5 h-5 absolute bottom-0.5 -right-0.5 sm:w-6 sm:h-6"
            strokeWidth={2}
            fill={CYAN}
            stroke={NAVY}
          />
        </div>
        <div className="flex-1 space-y-4">
          <h2 className="font-syne text-xl font-bold tracking-tight text-white sm:text-2xl">
            Envie de faire plus ?
          </h2>
          <p
            className="text-base text-white/85 leading-relaxed"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            Votre forfait <strong className="text-white">{planName}</strong> inclut{" "}
            <strong className="text-white">{currentLimit}</strong> {certWord}. Passez en{" "}
            <strong className="text-white">{nextPlanName}</strong> pour aller jusqu’à{" "}
            <strong className="text-white">{nextPlanLimit}</strong> {nextWord}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center pt-1">
            <Link
              href={upgradeHref}
              className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold transition hover:opacity-90 text-center"
              style={{ background: CYAN, color: NAVY }}
            >
              Passer à {nextPlanName} — {nextPlanPrice}
            </Link>
          </div>
          <Link
            href="/dashboard"
            className="inline-block text-sm text-white/50 hover:text-white/75 underline-offset-2 hover:underline"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            Retour au dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
