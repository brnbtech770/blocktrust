"use client";

import Link from "next/link";
import { ShieldCheck, UserCheck, Link2 } from "lucide-react";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28"
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-5 lg:gap-12">
        {/* Texte */}
        <div className="lg:col-span-3 order-1">
          {/* Pill eyebrow */}
          <div
            className="opacity-0 animate-fade-up [animation-delay:0ms] inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm sm:text-base font-mono tracking-wider text-gold drop-shadow-[0_0_10px_rgba(0,212,255,0.5)]"
            style={{
              background: "rgba(189,167,107,0.08)",
              borderColor: "var(--bt-border-gold)",
            }}
          >
            <span aria-hidden>✦</span>
            Certifié · Ancré · Infalsifiable
          </div>

          {/* H1 */}
          <h1 className="opacity-0 animate-fade-up [animation-delay:120ms] font-syne mt-5 text-[28px] font-bold leading-[1.15] tracking-tight text-white overflow-visible sm:mt-6 sm:text-4xl lg:text-5xl">
            La carte d&apos;identité numérique de tout ce que vous envoyez.
          </h1>

          {/* Sous-titre */}
          <p className="opacity-0 animate-fade-up [animation-delay:280ms] mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-6 sm:text-lg">
            CV, devis, contrat, document important.{" "}
            <span className="font-bold tracking-wider text-bt-cyan">
              BLOCKTRUST
            </span>{" "}
            prouve que c&apos;est bien vous — et que rien n&apos;a été modifié.
            Vérifiable par n&apos;importe qui, en 1 scan.{" "}
            <span className="text-white/90">
              Vérifiez aussi l&apos;authenticité de ce que vous recevez.
            </span>
          </p>

          {/* CTAs + micro-copy */}
          <div className="opacity-0 animate-fade-in [animation-delay:460ms] mt-7 flex flex-col items-start gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center rounded-xl bg-bt-cyan px-8 py-4 text-sm font-bold text-navy shadow-glow-cyan transition-all hover:scale-[1.04] hover:bg-[#21dfff] sm:text-base"
              >
                Certifier mon identité
              </Link>
              <Link
                href="/how-to"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-8 py-4 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 sm:text-base"
              >
                Voir comment ça marche
              </Link>
            </div>
            <p className="text-xs font-light text-white/60">
              Inscription en 30 secondes — certification après abonnement
            </p>
          </div>

          {/* Stats — 3 promesses utilisateur */}
          <ul className="opacity-0 animate-fade-up [animation-delay:600ms] mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-bt-cyan" />
              <div>
                <div className="font-syne text-base font-bold text-gold">
                  Infalsifiable
                </div>
                <div className="text-xs text-white/60">
                  certification cryptographique
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <div className="font-syne text-base font-bold text-gold">
                  Anti-usurpation
                </div>
                <div className="text-xs text-white/60">protection identité</div>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-bt-cyan" />
              <div>
                <div className="font-syne text-base font-bold text-gold">
                  On-chain
                </div>
                <div className="text-xs text-white/60">ancré blockchain</div>
              </div>
            </li>
          </ul>
        </div>

        {/* Badge BlockTrust SVG — float + glow-pulse cyan */}
        <div className="lg:col-span-2 order-2 flex justify-center lg:justify-end">
          <div className="opacity-0 animate-fade-in [animation-delay:300ms]">
            <div className="relative w-56 sm:w-72 lg:w-80 aspect-square animate-float drop-shadow-[0_0_40px_rgba(0,212,255,0.4)]">
              {/* Halo cyan pulsé en arrière-plan */}
              <div
                aria-hidden
                className="absolute inset-[-12%] rounded-full animate-glow-pulse"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(0,212,255,0.4) 0%, rgba(0,212,255,0.1) 45%, rgba(0,212,255,0) 75%)",
                }}
              />
              <BlockTrustBadge className="relative !w-full !h-full [&>svg]:!w-full [&>svg]:!h-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
