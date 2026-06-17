"use client";

import Link from "next/link";
import { ShieldCheck, UserCheck, Link2 } from "lucide-react";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";
import TechTermTooltip from "@/app/components/ui/TechTermTooltip";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-8 sm:pb-12 lg:pt-24 lg:pb-28"
    >
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-5 lg:gap-12 lg:items-center">
        {/* Texte */}
        <div className="order-1 lg:col-span-3">
          {/* Pill eyebrow */}
          <div
            className="opacity-0 animate-fade-up [animation-delay:0ms] inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm sm:text-base font-mono tracking-wider neon-gold"
            style={{
              background: "rgba(189,167,107,0.08)",
              borderColor: "var(--bt-border-gold)",
            }}
          >
            <span><span aria-hidden>✦</span> Certifié</span>
            <span><span aria-hidden>✦</span> Protégé</span>
            <span><span aria-hidden>✦</span> Infalsifiable</span>
          </div>

          {/* H1 */}
          <h1 className="opacity-0 animate-fade-up [animation-delay:120ms] font-syne mt-5 max-w-none text-balance text-2xl font-bold leading-[1.2] tracking-tight text-white sm:mt-6 sm:text-3xl lg:whitespace-nowrap lg:text-[1.875rem] lg:leading-tight xl:text-[2.125rem]">
            L&apos;identité numérique{" "}
            <span className="text-bt-cyan">protège vos échanges.</span>
          </h1>

          {/* Sous-titre — headline validée équipe (Deborah + Laurianne 28/04/2026) */}
          <p className="opacity-0 animate-fade-up [animation-delay:280ms] mt-5 max-w-2xl text-balance text-left font-sans text-lg leading-relaxed text-white sm:mt-6 sm:text-xl">
            La preuve que c&apos;est <span className="font-semibold text-bt-cyan">vous</span>.
            La certitude que c&apos;est <span className="font-semibold text-gold">eux</span>.
          </p>
          <p className="opacity-0 animate-fade-up [animation-delay:360ms] mt-2 max-w-2xl text-balance text-sm leading-relaxed text-white/40">
            Certifiez ce que vous envoyez. Vérifiez ce que vous recevez. Faux RIB, faux conseiller, faux
            fournisseur — détectés en 1 scan avant que le mal soit fait.
          </p>

          {/* CTAs + micro-copy */}
          <div className="opacity-0 animate-fade-in [animation-delay:460ms] mt-7 flex flex-col items-start gap-3">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/auth/register"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-bt-cyan px-8 py-4 text-sm font-bold text-navy shadow-glow-cyan transition-all hover:scale-[1.04] hover:bg-[#21dfff] sm:w-auto sm:text-base"
              >
                Certifier mon identité
              </Link>
              <Link
                href="/how-to"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-white/20 px-8 py-4 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 sm:w-auto sm:text-base"
              >
                Voir comment ça marche
              </Link>
            </div>
            <p className="text-xs font-light leading-relaxed text-white/60 sm:text-sm">
              Vérification gratuite pour tous ·{" "}
              <Link href="/pricing" className="cursor-pointer text-bt-cyan/90 hover:text-bt-cyan">
                Voir nos tarifs
              </Link>{" "}
              · Sans engagement
            </p>
          </div>

          {/* Stats — 3 promesses utilisateur */}
          <ul className="opacity-0 animate-fade-up [animation-delay:600ms] mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-bt-cyan" />
              <div>
                <div className="font-syne text-balance text-base font-bold text-gold">
                  Vos envois certifiés
                </div>
                <div className="text-xs text-white/60">Prouvez que c&apos;est bien vous</div>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
              <div>
                <div className="font-syne text-balance text-base font-bold text-gold">
                  Vos réceptions protégées
                </div>
                <div className="text-xs text-white/60">Détectez les usurpations</div>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-bt-cyan" />
              <div>
                <div className="font-syne text-balance text-base font-bold text-gold">
                  Ancré <TechTermTooltip term="blockchain">blockchain</TechTermTooltip>
                </div>
                <div className="text-xs text-white/60">
                  Preuve immuable <TechTermTooltip term="polygon">Polygon</TechTermTooltip>
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* Badge — mobile : largeur vue = carré implicite ; halo centré largeur×hauteur identiques (Safari) */}
        <div className="order-2 flex w-full justify-center lg:col-span-2 lg:w-auto lg:justify-end lg:self-center">
          <div className="opacity-0 animate-fade-in [animation-delay:300ms] flex w-full flex-col items-center px-1 pt-6 pb-16 sm:px-2 sm:pt-8 sm:pb-20 lg:max-w-none lg:px-0 lg:pb-0 lg:pt-0">
            <div
              className="relative isolate mx-auto aspect-square w-[min(17.5rem,88vw)] shrink-0 animate-float overflow-visible drop-shadow-[0_0_36px_rgba(0,212,255,0.38)] sm:w-[min(18rem,90vw)] lg:h-80 lg:w-80 lg:max-w-none"
              style={{ WebkitTransform: "translateZ(0)" }}
            >
              <div
                aria-hidden
                className="hero-badge-glow pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: "124%",
                  height: "124%",
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(0,212,255,0.44) 0%, rgba(0,212,255,0.14) 42%, transparent 70%)",
                }}
              />
              <BlockTrustBadge
                instanceId="hero-badge"
                size="fill"
                showWatermark={false}
                className="relative z-10 flex h-full w-full flex-col items-center justify-center [&_svg]:block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
