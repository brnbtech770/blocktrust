"use client";

import { Shield, User, AlertTriangle, MailWarning, type LucideIcon } from "lucide-react";
import Reveal from "./Reveal";

type Card = {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  text: string;
  featured?: boolean;
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
  {
    icon: MailWarning,
    iconColor: "#E05252",
    title: "Un faux vous circule déjà",
    text: "Une lettre change dans l'adresse email, le nom de domaine, le numéro de téléphone. Vos contacts se font arnaquer en croyant vous contacter. Sans BLOCKTRUST, vous ne le saurez jamais.",
    featured: true,
  },
];

export default function Problem() {
  return (
    <section
      id="probleme"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-24 lg:py-24"
    >
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] neon-red">
          Le problème
        </p>
        <h2 className="font-syne mx-auto max-w-2xl text-2xl font-semibold leading-snug text-white sm:text-3xl">
          Chaque jour, des milliers d&apos;arnaques exploitent votre{" "}
          <span className="text-red-400">identité digitale</span>
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Reveal
              key={card.title}
              delay={150 * i}
              className="group relative rounded-xl border border-red-500/20 bg-white/5 p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-red-500/40 hover:bg-white/[0.07]"
            >
              {card.featured && (
                <span className="neon-red absolute top-3 right-3 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  Menace entrante
                </span>
              )}
              <div
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-lg"
                style={{
                  background: `${card.iconColor}1a`,
                  border: `1px solid ${card.iconColor}40`,
                }}
              >
                <Icon className="h-6 w-6" style={{ color: card.iconColor }} />
              </div>
              <h3 className="font-syne mb-2 text-base font-semibold text-white">
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/70">{card.text}</p>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
