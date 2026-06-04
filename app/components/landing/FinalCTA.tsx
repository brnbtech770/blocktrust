"use client";

import Link from "next/link";
import { Anchor, Award, ShieldCheck, KeyRound, type LucideIcon } from "lucide-react";
import Reveal from "./Reveal";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

const proofs: { icon: LucideIcon; text: string }[] = [
  { icon: Anchor, text: "Ancrage Bitcoin (OpenTimestamp, 29 mai 2026) — preuve d'antériorité publique" },
  { icon: Award, text: "Marque déposée BLOCKTRUST™ n°5253718 (INPI, 30 avril 2026)" },
  { icon: ShieldCheck, text: "Données hébergées en Europe · Conformité RGPD" },
  { icon: KeyRound, text: "Cryptographie ES256 + ancrage Polygon Mainnet" },
];

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

        <h2 className="font-syne mx-auto mt-6 max-w-2xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
          Commencez à construire votre{" "}
          <span className="text-bt-cyan">réputation vérifiable.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
          Gratuit. Sans carte bancaire. Badge actif en moins d&apos;une minute.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/auth/register"
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-bt-cyan px-8 py-4 text-sm font-bold text-navy shadow-glow-cyan transition-all hover:scale-[1.04] hover:bg-[#21dfff] sm:w-auto sm:text-base"
          >
            Créer mon badge gratuitement
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-white/20 px-8 py-4 text-sm font-semibold text-white transition-all hover:border-white/40 hover:bg-white/5 sm:w-auto sm:text-base"
          >
            Voir les tarifs
          </Link>
        </div>

        <p className="mx-auto mt-5 max-w-md text-xs leading-relaxed text-white/55 sm:text-sm">
          Le plan Découverte est gratuit. Aucun engagement. Passez au plan payant quand vous en avez
          besoin.
        </p>

        {/* Preuves (S7) */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 border-t border-white/10 pt-8 sm:grid-cols-2">
          {proofs.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.text}
                className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-bt-cyan" aria-hidden />
                <span className="text-xs leading-relaxed text-white/65">{p.text}</span>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
