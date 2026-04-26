"use client";

import Link from "next/link";
import { ShieldCheck, Lock, Network } from "lucide-react";
import { Logo } from "@/app/components/ui/Logo";
import StatCounter from "./StatCounter";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28"
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-5 lg:gap-12">
        {/* Texte */}
        <div className="lg:col-span-3 order-1">
          <div
            className="opacity-0 animate-fade-up [animation-delay:0ms] inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] sm:text-[13px] text-white"
            style={{
              background: "rgba(0,212,255,0.08)",
              borderColor: "var(--bt-cyan-border)",
            }}
          >
            <span className="text-bt-cyan">✦</span>
            Technologie&nbsp;
            <span className="font-bold text-bt-cyan">Polygon</span>&nbsp;Blockchain
          </div>

          <h1 className="opacity-0 animate-fade-up [animation-delay:120ms] font-syne mt-5 text-3xl font-bold leading-[1.15] tracking-tight text-white overflow-visible sm:mt-6 sm:text-4xl lg:text-5xl">
            Protégez chaque interaction de votre{" "}
            <span className="text-bt-cyan inline-block pb-2 leading-normal align-baseline">
              écosystème digital
            </span>
          </h1>

          <p className="opacity-0 animate-fade-up [animation-delay:280ms] mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-6 sm:text-lg">
            BlockTrust certifie votre identité et sécurise vos échanges en ligne — pour
            les <span className="text-white font-medium">particuliers</span> comme pour
            les <span className="text-white font-medium">entreprises</span>.
          </p>

          <div className="opacity-0 animate-fade-in [animation-delay:460ms] mt-7 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-xl bg-bt-cyan px-8 py-4 text-sm font-bold text-navy shadow-glow-cyan transition-all hover:scale-[1.04] hover:bg-[#21dfff] sm:text-base"
            >
              Créer mon badge
            </Link>
            <a
              href="#comment"
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-8 py-4 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 sm:text-base"
            >
              Voir comment ça marche
            </a>
          </div>

          {/* Stats compteurs */}
          <ul className="opacity-0 animate-fade-up [animation-delay:600ms] mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-bt-cyan" />
              <div>
                <div className="font-syne text-xl font-bold text-white">
                  <StatCounter value={99.9} decimals={1} suffix="%" />
                </div>
                <div className="text-xs text-white/60">de disponibilité</div>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <div className="font-syne text-xl font-bold text-white">
                  <StatCounter value={256} suffix="-bit" />
                </div>
                <div className="text-xs text-white/60">encryption</div>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Network className="mt-0.5 h-5 w-5 shrink-0 text-bt-cyan" />
              <div>
                <div className="font-syne text-xl font-bold text-white">Polygon</div>
                <div className="text-xs text-white/60">blockchain ancrée</div>
              </div>
            </li>
          </ul>
        </div>

        {/* Logo BlockTrust (composant centralisé) — float + drop-shadow cyan */}
        <div className="lg:col-span-2 order-2 flex justify-center lg:justify-end">
          <div className="opacity-0 animate-fade-in [animation-delay:300ms] w-48 sm:w-64 lg:w-80 animate-float drop-shadow-[0_0_30px_rgba(0,212,255,0.4)]">
            <Logo size="hero" withText={false} href={undefined} className="!w-full !h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
