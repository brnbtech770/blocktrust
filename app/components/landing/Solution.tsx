"use client";

import { UserPlus, ShieldCheck, CheckCircle2, type LucideIcon } from "lucide-react";
import Reveal from "./Reveal";

type Step = {
  icon: LucideIcon;
  iconColor: string;
  ringColor: string;
  step: string;
  title: string;
  text: string;
};

const steps: Step[] = [
  {
    icon: UserPlus,
    iconColor: "#00d4ff",
    ringColor: "rgba(0,212,255,0.35)",
    step: "Étape 1",
    title: "Créez votre badge",
    text: "Inscrivez-vous et certifiez votre identité : email, téléphone, domaine web. Votre badge BLOCKTRUST est généré automatiquement. Il est unique, infalsifiable. L'ancrage sur la blockchain Polygon est activé à partir du plan Essentiel.",
  },
  {
    icon: ShieldCheck,
    iconColor: "#BDA76B",
    ringColor: "rgba(189,167,107,0.4)",
    step: "Étape 2",
    title: "Partagez. Recevez.",
    text: "Ajoutez votre badge à votre signature email, votre profil, votre site. Vos interlocuteurs peuvent vérifier votre identité en un clic — sans compte, sans app.",
  },
  {
    icon: CheckCircle2,
    iconColor: "#00d4ff",
    ringColor: "rgba(0,212,255,0.35)",
    step: "Étape 3",
    title: "Vérifiez avant d'interagir.",
    text: "Scannez le QR code ou cliquez sur le badge d'un contact. Vous voyez instantanément : identité vérifiée, niveau de confiance (TrustScore), relations certifiées. Vous décidez en connaissance de cause.",
  },
];

export default function Solution() {
  return (
    <section
      id="comment"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] neon-cyan">
          Comment ça marche
        </p>
        <h2 className="font-syne mx-auto max-w-2xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
          3 étapes. <span className="text-bt-cyan">Moins d&apos;une minute.</span>
        </h2>
      </Reveal>

      <div className="relative mt-14 mx-auto max-w-3xl">
        <ol className="space-y-10 sm:space-y-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === steps.length - 1;
            return (
              <Reveal
                as="li"
                key={step.title}
                delay={200 * i}
                className="relative pl-16 sm:pl-20"
              >
                {/* Connecteur vertical vers l'étape suivante (masqué sur le dernier item) */}
                {!isLast && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-6 top-12 -bottom-10 w-px sm:left-7 sm:top-14 sm:-bottom-12"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(0,212,255,0.6), rgba(189,167,107,0.4), rgba(0,212,255,0.6))",
                    }}
                  />
                )}
                <div
                  className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full border-2 sm:h-14 sm:w-14"
                  style={{
                    background: "rgba(10,22,40,0.95)",
                    borderColor: step.ringColor,
                    boxShadow: `0 0 24px ${step.ringColor}`,
                  }}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: step.iconColor }} />
                </div>
                <h3 className="font-syne mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg font-semibold leading-snug text-white sm:text-xl">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                    {step.step}
                  </span>
                  <span>{step.title}</span>
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">
                  {step.text}
                </p>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
