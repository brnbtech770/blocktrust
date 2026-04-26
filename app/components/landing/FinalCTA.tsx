"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <section
      id="cta"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal
        className="relative overflow-hidden rounded-3xl border border-bt-cyan/25 p-8 text-center sm:p-12 lg:p-16"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
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

        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-bt-cyan/40 bg-bt-cyan/10 animate-glow-pulse">
          <ShieldCheck className="h-7 w-7 text-bt-cyan" />
        </div>

        <h2 className="font-syne mt-6 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          <span className="block">Prêt à sécuriser</span>
          <span className="block">
            votre <span className="text-bt-cyan">identité digitale&nbsp;?</span>
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-white/75">
          Rejoignez les professionnels qui font confiance à BlockTrust pour protéger
          chacune de leurs interactions.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/auth/register"
            className="inline-flex w-full items-center justify-center rounded-xl bg-bt-cyan px-8 py-4 text-sm font-bold text-navy shadow-glow-cyan transition-all hover:scale-[1.04] hover:bg-[#21dfff] sm:w-auto sm:text-base"
          >
            Créer mon badge maintenant
          </Link>
          <Link
            href="/pricing"
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-8 py-4 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 sm:w-auto sm:text-base"
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
