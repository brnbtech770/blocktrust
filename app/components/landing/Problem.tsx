"use client";

import { Shield, User, AlertTriangle, type LucideIcon } from "lucide-react";
import Reveal from "./Reveal";

type Card = {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  text: string;
};

const cards: Card[] = [
  {
    icon: Shield,
    iconColor: "#E05252",
    title: "Usurpation d'identité",
    text: "Des fraudeurs copient votre email, votre site, vos coordonnées bancaires pour tromper vos contacts.",
  },
  {
    icon: User,
    iconColor: "#E8943A",
    title: "Faux profils professionnels",
    text: "N'importe qui peut se faire passer pour vous sur LinkedIn, email ou WhatsApp.",
  },
  {
    icon: AlertTriangle,
    iconColor: "#D4B355",
    title: "Perte de confiance client",
    text: "Une arnaque associée à votre nom suffit à détruire des années de réputation.",
  },
];

export default function Problem() {
  return (
    <section
      id="probleme"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-red-400/80">
          Le problème
        </p>
        <h2 className="font-syne text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
          Chaque jour, des milliers d&apos;arnaques exploitent votre{" "}
          <span className="text-red-400">identité digitale</span>
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Reveal
              key={card.title}
              delay={150 * i}
              className="group rounded-xl border border-red-500/20 bg-white/5 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-red-500/40 hover:bg-white/[0.07]"
            >
              <div
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg"
                style={{
                  background: `${card.iconColor}1a`,
                  border: `1px solid ${card.iconColor}40`,
                }}
              >
                <Icon className="h-6 w-6" style={{ color: card.iconColor }} />
              </div>
              <h3 className="font-syne mb-2 text-lg sm:text-xl font-semibold text-white">
                {card.title}
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-white/70">{card.text}</p>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
