"use client";

import type { ReactNode } from "react";

export const TECH_TERM_DEFINITIONS = {
  blockchain: "Registre numérique infalsifiable et public",
  polygon: "Réseau blockchain utilisé pour l'ancrage des badges",
  es256: "Standard de signature cryptographique bancaire",
  "qr-rotatif": "Code QR qui change régulièrement pour éviter la copie",
  "signature-es256-sha256":
    "Signature cryptographique ES256 combinée au hachage SHA-256",
  zataz: "Site français de veille cybersécurité",
  "cert-fr": "Centre gouvernemental de veille et d'alerte",
  pertinence:
    "Score calculé par BLOCKTRUST selon la gravité et la proximité de la menace",
} as const;

export type TechTermKey = keyof typeof TECH_TERM_DEFINITIONS;

type Props = {
  term: TechTermKey;
  children: ReactNode;
  className?: string;
};

/** Terme technique souligné en pointillé avec infobulle au survol. */
export default function TechTermTooltip({ term, children, className = "" }: Props) {
  const definition = TECH_TERM_DEFINITIONS[term];
  return (
    <abbr
      title={definition}
      className={`cursor-help border-b border-dotted border-white/40 no-underline decoration-transparent ${className}`.trim()}
    >
      {children}
    </abbr>
  );
}
