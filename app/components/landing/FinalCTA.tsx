"use client";

import Link from "next/link";
import Reveal from "./Reveal";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

export default function FinalCTA() {
  return (
    <section
      id="cta"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal
        className="relative overflow-visible rounded-3xl border border-bt-cyan/25 p-8 text-center sm:p-12 lg:p-16"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(10,22,40,0.95) 0%, rgba(0,212,255,0.18) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "rgba(0,212,255,0.25)" }}
        />

        <div className="mx-auto flex justify-center">
          <BlockTrustBadge size={64} instanceId="final-cta" showWatermark={false} />
        </div>

        <h2 className="font-syne mx-auto mt-6 max-w-3xl text-balance text-2xl font-semibold leading-snug text-white sm:text-3xl">
          Prêt à sécuriser votre{" "}
          <span className="text-bt-cyan">identité digitale&nbsp;?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-sm leading-relaxed text-white/75 sm:text-base">
          Rejoignez les professionnels qui font confiance à BLOCKTRUST pour protéger
          chacune de leurs interactions.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/auth/register"
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-bt-cyan px-8 py-4 text-sm font-bold text-navy shadow-glow-cyan transition-all hover:scale-[1.04] hover:bg-[#21dfff] sm:w-auto sm:text-base"
          >
            Créer mon badge maintenant
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-white/20 px-8 py-4 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 sm:w-auto sm:text-base"
          >
            Comparer les plans
          </Link>
        </div>

        <p className="mt-5 text-xs text-white/55 sm:text-sm">
          Sans engagement — Annulable à tout moment
        </p>
      </Reveal>
    </section>
  );
}
