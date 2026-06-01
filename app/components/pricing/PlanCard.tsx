"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import type { PlanAccordionFeature } from "@/lib/pricing";

export type PlanCardProps = {
  mode: "B2C" | "B2B";
  name: string;
  description: string;
  price: number | string;
  priceUnit?: string;
  subtitle: string;
  badges: { label: string; style: "gold" | "muted" | "multiSupport" }[];
  features: string[];
  accordionFeatures?: readonly PlanAccordionFeature[];
  cta: string;
  ctaStyle: { background: string; border?: string; color: string };
  isPopular: boolean;
  icon: "person" | "shield" | "group" | "building" | "crown";
  ctaHref?: string;
  ctaOnClick?: () => void;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  /** Ligne sous le prix (ex. mentions HT/TVA). */
  priceTaxNote?: string;
  /** Chip vert affiché à côté du prix (ex. « Économie 12€/an » ou « -20% »). */
  savingBadge?: string;
  /** Petite ligne mutée sous le prix (ex. « facturé 35,88€/an »). */
  billedNote?: string;
  /** Contrôle additionnel rendu juste avant le CTA (ex. sélecteur de sièges). */
  extraControl?: ReactNode;
};

const ICONS = {
  person: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  ),
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  ),
  group: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  ),
  building: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  ),
  crown: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
    />
  ),
};

export default function PlanCard({
  mode,
  name,
  description,
  price,
  priceUnit = "/mois",
  subtitle,
  badges,
  features,
  accordionFeatures,
  cta,
  ctaStyle,
  isPopular,
  icon,
  ctaHref,
  ctaOnClick,
  ctaDisabled = false,
  ctaLoading = false,
  priceTaxNote,
  savingBadge,
  billedNote,
  extraControl,
}: PlanCardProps) {
  const [open, setOpen] = useState(false);
  const checkColor = mode === "B2B" ? "#00d4ff" : "var(--bt-gold)";
  const popularBorder = mode === "B2B" ? "#00d4ff" : "var(--bt-gold)";
  const detailRows = accordionFeatures?.length ? accordionFeatures : [];

  return (
    <div
      className="relative flex flex-col rounded-2xl p-7 transition-all duration-200"
      style={{
        background: "rgba(13,31,60,0.8)",
        border: `1px solid ${isPopular ? popularBorder : "rgba(255,255,255,0.12)"}`,
        boxShadow: isPopular ? "0 0 30px rgba(0,212,255,0.1)" : undefined,
      }}
    >
      {isPopular && (
        <div
          className="absolute left-1/2 -top-4 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-bold"
          style={{
            background: mode === "B2C" ? "var(--bt-gold)" : "#00d4ff",
            color: "#0a1628",
          }}
        >
          Le plus populaire
        </div>
      )}

      <div className="mb-2 flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <svg
            className="h-8 w-8"
            style={{ color: "var(--bt-muted)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {ICONS[icon]}
          </svg>
        </div>
        <div>
          <h3 className="font-syne text-lg font-bold text-white">{name}</h3>
          <p className="text-sm" style={{ color: "var(--bt-muted)" }}>
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mb-2 mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {typeof price === "number" ? (
          <>
            <span className="font-mono text-[42px] font-extrabold tabular-nums text-white md:text-4xl">
              {price.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
            </span>
            <span className="text-base" style={{ color: "var(--bt-muted)" }}>
              {priceUnit}
            </span>
          </>
        ) : (
          <span className="font-syne text-2xl font-extrabold text-gold md:text-3xl">{price}</span>
        )}
        {savingBadge ? (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{
              background: "rgba(29,184,126,0.15)",
              color: "#1DB87E",
              border: "1px solid rgba(29,184,126,0.3)",
            }}
          >
            {savingBadge}
          </span>
        ) : null}
      </div>

      {billedNote ? (
        <p className="mb-1 text-xs text-white/40">{billedNote}</p>
      ) : null}

      {priceTaxNote ? (
        <p className="mb-2 text-center text-xs text-white/30">{priceTaxNote}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {badges.map((b, i) => (
          <span
            key={i}
            className="rounded-md px-2.5 py-1 text-[11px] font-bold"
            style={
              b.style === "gold"
                ? { background: "var(--bt-gold)", color: "#0a1628" }
                : b.style === "multiSupport"
                  ? {
                      background: "rgba(0,212,255,0.1)",
                      border: "1px solid rgba(0,212,255,0.3)",
                      color: "#00d4ff",
                    }
                  : {
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }
            }
          >
            {b.label}
          </span>
        ))}
      </div>

      <p className="mb-4 text-sm" style={{ color: "var(--bt-muted)" }}>
        {description}
      </p>

      <ul className="mb-6 flex-1 space-y-2">
        {features.map((f, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[13px]"
            style={{ color: "var(--bt-muted)", marginBottom: 8 }}
          >
            <svg
              className="mt-0.5 h-[14px] w-[14px] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke={checkColor}
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {extraControl ? <div className="mb-4">{extraControl}</div> : null}

      {ctaHref ? (
        <a
          href={ctaHref}
          className="w-full rounded-[10px] px-4 py-3.5 text-center text-sm font-bold transition-all duration-200 hover:-translate-y-px hover:brightness-110"
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
          className="flex w-full items-center justify-center gap-2 rounded-[10px] px-4 py-3.5 text-sm font-bold transition-all duration-200 hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={{
            background: ctaStyle.background,
            border: ctaStyle.border ?? "none",
            color: ctaStyle.color,
          }}
        >
          {ctaLoading ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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

      {detailRows.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 flex w-full items-center justify-center gap-2 text-xs text-white/40 transition-all duration-200 hover:text-white/70"
          >
            <ChevronDown
              className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
            {open ? "Masquer le détail" : "Voir le détail complet"}
          </button>

          <div
            className={`grid transition-all duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                {detailRows.map((feature, idx) => (
                  <div key={`${feature.name}-${idx}`} className="flex items-start gap-2">
                    {feature.included ? (
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" aria-hidden />
                    ) : (
                      <X className="mt-0.5 h-3 w-3 shrink-0 text-white/20" aria-hidden />
                    )}
                    <span
                      className={`text-xs leading-relaxed transition-colors duration-200 ${feature.included ? "text-white/60" : "text-white/20"}`}
                    >
                      {feature.name}
                      {feature.value ? (
                        <span className="ml-1 text-white/40">— {feature.value}</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <p className="mt-2 text-center text-xs text-white/30">
        Sans engagement · Résiliable à tout moment
      </p>
    </div>
  );
}
