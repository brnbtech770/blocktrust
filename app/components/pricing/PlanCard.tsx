"use client";

import type { ReactNode } from "react";
import { Check, Circle } from "lucide-react";
import { formatPriceFr } from "@/lib/pricing";

export type PlanCardFeature =
  | string
  | { label: string; muted?: boolean };

export type PlanCardProps = {
  name: string;
  /** Montant numérique, « Gratuit » ou « Sur devis ». */
  price: number | "Gratuit" | "Sur devis";
  /** Ex. « (TTC) » ou « (HT) » — affiché à côté du prix. */
  taxLabel?: string;
  /** Ex. « /mois » ou « /mois/utilisateur ». */
  priceUnit?: string;
  features: readonly PlanCardFeature[];
  cta: string;
  ctaStyle: { background: string; border?: string; color: string };
  isPopular?: boolean;
  popularLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  /** Ligne discrète sous le prix (ex. facturation annuelle). */
  billedNote?: string;
  /** Mention alternative mensuel ↔ annuel. */
  altBillingNote?: string;
  extraControl?: ReactNode;
  footerNote?: ReactNode;
};

function featureLabel(feature: PlanCardFeature): string {
  return typeof feature === "string" ? feature : feature.label;
}

function featureMuted(feature: PlanCardFeature): boolean {
  return typeof feature === "object" && feature.muted === true;
}

export default function PlanCard({
  name,
  price,
  taxLabel,
  priceUnit = "/mois",
  features,
  cta,
  ctaStyle,
  isPopular = false,
  popularLabel = "Populaire",
  ctaHref,
  ctaOnClick,
  ctaDisabled = false,
  ctaLoading = false,
  billedNote,
  altBillingNote,
  extraControl,
  footerNote,
}: PlanCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-200 sm:p-7 ${
        isPopular
          ? "border-bt-cyan shadow-[0_0_30px_rgba(0,212,255,0.12)]"
          : "border-white/10 bg-[rgba(13,31,60,0.6)]"
      }`}
      style={isPopular ? { background: "rgba(13,31,60,0.85)" } : undefined}
    >
      {isPopular ? (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-bt-cyan px-3 py-1 text-xs font-bold text-[#0a1628]">
          {popularLabel}
        </div>
      ) : null}

      <h3 className="font-syne text-balance text-lg font-bold text-white">{name}</h3>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        {typeof price === "number" ? (
          <>
            <span className="font-mono text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
              {formatPriceFr(price)}€
            </span>
            {taxLabel ? (
              <span className="text-sm text-white/50">{taxLabel}</span>
            ) : null}
            {priceUnit ? (
              <span className="text-sm text-white/50">{priceUnit}</span>
            ) : null}
          </>
        ) : (
          <span
            className={`font-syne text-2xl font-extrabold sm:text-3xl ${
              price === "Gratuit" ? "text-gold" : "text-white"
            }`}
          >
            {price}
          </span>
        )}
      </div>

      {billedNote ? (
        <p className="mt-1 text-xs text-white/40">{billedNote}</p>
      ) : null}

      {altBillingNote ? (
        <p className="mt-1 text-xs text-white/45">{altBillingNote}</p>
      ) : null}

      <ul className="mt-5 mb-6 flex-1 space-y-2.5">
        {features.map((feature) => {
          const muted = featureMuted(feature);
          const label = featureLabel(feature);
          return (
            <li
              key={label}
              className={`flex items-start gap-2 text-sm ${
                muted ? "text-white/40" : "text-white/70"
              }`}
            >
              {muted ? (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/30" aria-hidden />
              ) : (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-bt-cyan" aria-hidden />
              )}
              <span>{label}</span>
            </li>
          );
        })}
      </ul>

      {footerNote ? <div className="mb-4 text-xs text-white/50">{footerNote}</div> : null}

      {extraControl ? <div className="mb-4">{extraControl}</div> : null}

      {ctaHref ? (
        <a
          href={ctaHref}
          className="w-full cursor-pointer rounded-[10px] px-4 py-3 text-center text-sm font-bold transition-all duration-200 hover:-translate-y-px hover:brightness-110"
          style={{
            background: ctaStyle.background,
            border: ctaStyle.border ?? "none",
            color: ctaStyle.color,
          }}
        >
          {cta}
        </a>
      ) : (
        <button
          type="button"
          onClick={ctaOnClick}
          disabled={ctaDisabled || ctaLoading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] px-4 py-3 text-sm font-bold transition-all duration-200 hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={{
            background: ctaStyle.background,
            border: ctaStyle.border ?? "none",
            color: ctaStyle.color,
          }}
        >
          {ctaLoading ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Redirection...
            </>
          ) : (
            cta
          )}
        </button>
      )}

      <p className="mt-3 text-center text-xs text-white/30">
        Sans engagement · Résiliable à tout moment
      </p>
    </div>
  );
}
