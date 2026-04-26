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
    title: "Inscrivez-vous et vérifiez votre identité",
    text: "KYC sécurisé via Stripe Identity. Particulier ou entreprise, en moins de 5 minutes.",
  },
  {
    icon: ShieldCheck,
    iconColor: "#BDA76B",
    ringColor: "rgba(189,167,107,0.4)",
    step: "Étape 2",
    title: "Obtenez votre badge certifié blockchain",
    text: "Un QR code unique, ancré sur Polygon, impossible à copier ou falsifier.",
  },
  {
    icon: CheckCircle2,
    iconColor: "#00d4ff",
    ringColor: "rgba(0,212,255,0.35)",
    step: "Étape 3",
    title: "Intégrez votre badge partout",
    text: "Site web, email, documents, appels vidéo — votre identité certifiée visible à chaque échange.",
  },
];

export default function Solution() {
  return (
    <section
      id="comment"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-bt-cyan/80">
          La solution
        </p>
        <h2 className="font-syne text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
          3 étapes pour sécuriser votre <span className="text-bt-cyan">identité</span>
        </h2>
      </Reveal>

      <div className="relative mt-14 mx-auto max-w-3xl">
        {/* Ligne verticale animée */}
        <div
          aria-hidden
          className="absolute left-6 top-2 bottom-2 w-px origin-top sm:left-7"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,212,255,0.6), rgba(189,167,107,0.4), rgba(0,212,255,0.6))",
          }}
        >
          <div className="absolute inset-0 animate-draw-line bg-inherit" />
        </div>

        <ol className="space-y-10 sm:space-y-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal
                as="li"
                key={step.title}
                delay={200 * i}
                className="relative pl-16 sm:pl-20"
              >
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
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  {step.step}
                </div>
                <h3 className="font-syne mt-1 text-lg sm:text-xl font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm sm:text-base leading-relaxed text-white/70">
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
