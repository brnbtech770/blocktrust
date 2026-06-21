"use client";

import type { ReactNode } from "react";

export const TECH_TERM_DEFINITIONS = {
  blockchain:
    "Un registre numérique public et infalsifiable. Une fois qu'une information y est inscrite, personne ne peut la modifier — pas même BLOCKTRUST™. C'est ce qui garantit l'intégrité de votre badge.",
  polygon:
    "Polygon est le réseau blockchain utilisé par BLOCKTRUST™ pour inscrire la preuve de votre certification. C'est rapide, peu coûteux et vérifiable par n'importe qui.",
  es256:
    "Un standard de signature numérique utilisé par les banques et les institutions financières. Il garantit que votre badge ne peut pas être falsifié.",
  sha256:
    "Une empreinte numérique unique. Comme une empreinte digitale pour un document — si un seul caractère change, l'empreinte change complètement. C'est ce qui prouve qu'un contenu n'a pas été modifié.",
  "qr-rotatif":
    "Un QR code de vérification qui change régulièrement. Même si quelqu'un photographie votre QR, il expire après quelques heures et ne peut plus être réutilisé.",
  trustscore:
    "Un indicateur de confiance calculé à partir de signaux objectifs : identité vérifiée, réseau de contacts, historique d'interactions. Ce n'est pas une note de fiabilité — ce sont des éléments factuels pour évaluer la confiance.",
  bis: "Un procédé qui prouve qu'un email, un document ou un paiement provient bien de la personne certifiée. Même si sa boîte email est piratée, l'attaquant ne peut pas forger cette signature.",
  cryptographique:
    "Procédé mathématique qui garantit l'authenticité — comme un sceau numérique impossible à reproduire.",
  "signature-es256-sha256":
    "Signature cryptographique ES256 combinée au hachage SHA-256",
  zataz: "Site français de veille cybersécurité",
  "cert-fr": "Centre gouvernemental de veille et d'alerte",
  pertinence:
    "Score calculé par BLOCKTRUST selon la gravité et la proximité de la menace",
} as const;

export type TechTermKey = keyof typeof TECH_TERM_DEFINITIONS;

/** Entrées du lexique /how-to — labels + clés vers TECH_TERM_DEFINITIONS. */
export const HOW_TO_LEXICON_ENTRIES: ReadonlyArray<{
  id: string;
  label: string;
  term: TechTermKey;
}> = [
  { id: "lex-blockchain", label: "Blockchain", term: "blockchain" },
  { id: "lex-polygon", label: "Ancrage Polygon", term: "polygon" },
  { id: "lex-es256", label: "Signature ES256", term: "es256" },
  { id: "lex-sha256", label: "Hash SHA-256", term: "sha256" },
  { id: "lex-qr", label: "QR rotatif", term: "qr-rotatif" },
  { id: "lex-trustscore", label: "TrustScore", term: "trustscore" },
  { id: "lex-bis", label: "BIS (Signature d'Interaction)", term: "bis" },
];

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
