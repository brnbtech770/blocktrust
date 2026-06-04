"use client";

import { Activity, Radio, TrendingUp, Eye } from "lucide-react";
import Reveal from "./Reveal";

const points: { icon: typeof Activity; text: string }[] = [
  { icon: Radio, text: "Surveillance continue des contacts certifiés" },
  { icon: TrendingUp, text: "Évolution en temps réel du TrustScore" },
  { icon: Eye, text: "Détection proactive des signaux faibles" },
];

export default function TrustMonitoring() {
  return (
    <section
      id="trust-monitoring"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">
            <Activity className="h-4 w-4" />
            Trust Monitoring
          </p>
          <h2 className="font-syne max-w-xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
            BLOCKTRUST ne se contente pas d&apos;alerter.{" "}
            <span className="text-bt-cyan">Il surveille.</span>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Les autres solutions réagissent après l&apos;incident. BLOCKTRUST surveille en continu
            le niveau de confiance de vos interactions : un TrustScore qui évolue, un contact dont
            le domaine change, une relation du Trust Graph qui se dégrade — vous êtes informé avant
            de subir.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            C&apos;est la différence entre un système d&apos;alerte et une{" "}
            <span className="font-semibold text-white">infrastructure de confiance active</span>.
          </p>
        </Reveal>

        <Reveal delay={150} className="flex flex-col gap-4">
          {points.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.text}
                className="flex items-center gap-4 rounded-xl border border-bt-cyan/20 bg-white/[0.03] p-5"
              >
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bt-cyan/30 bg-bt-cyan/10">
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-full"
                    style={{ background: "rgba(0,212,255,0.18)" }}
                  />
                  <Icon className="relative h-5 w-5 text-bt-cyan" aria-hidden />
                </div>
                <p className="text-sm font-medium leading-snug text-white/85">{p.text}</p>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
