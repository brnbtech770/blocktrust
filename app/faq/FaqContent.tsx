"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

type FaqItem = { id: string; q: string; a: ReactNode };
type FaqSection = { title: string; items: FaqItem[] };

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "Questions générales",
    items: [
      {
        id: "general-what",
        q: "Qu'est-ce que BLOCKTRUST™ ?",
        a: (
          <p>
            BLOCKTRUST™ est une infrastructure de confiance numérique qui certifie votre identité et
            protège vos interactions contre l&apos;usurpation et le phishing.
          </p>
        ),
      },
      {
        id: "general-how",
        q: "Comment ça marche ?",
        a: (
          <p>
            Votre identité est vérifiée, puis signée cryptographiquement et ancrée sur la blockchain
            Polygon. Un badge vérifiable accompagne vos emails, votre site et vos signatures.
          </p>
        ),
      },
      {
        id: "general-pricing",
        q: "C'est gratuit ?",
        a: (
          <p>
            Le plan Découverte est gratuit et sans carte bancaire. Les plans payants démarrent à
            2,99&nbsp;€/mois pour les particuliers et 8,99&nbsp;€/mois par utilisateur pour les
            entreprises.{" "}
            <Link href="/pricing" className="text-bt-cyan hover:underline">
              Voir les tarifs
            </Link>
            .
          </p>
        ),
      },
      {
        id: "general-privacy",
        q: "Mes données sont-elles protégées ?",
        a: (
          <p>
            Oui. BLOCKTRUST™ est conforme au RGPD, hébergé en Europe, avec minimisation des données
            et registre des traitements.{" "}
            <Link href="/privacy" className="text-bt-cyan hover:underline">
              Voir notre politique de confidentialité
            </Link>
            .
          </p>
        ),
      },
    ],
  },
  {
    title: "Sécurité",
    items: [
      {
        id: "security-bis",
        q: "Qu'est-ce qu'une signature BIS ?",
        a: (
          <p>
            La BlockTrust Interaction Signature (BIS) prouve cryptographiquement qu&apos;une
            interaction (email, document, paiement) provient bien de l&apos;identité certifiée de
            l&apos;expéditeur. Même si sa boîte email est piratée, l&apos;attaquant ne peut pas
            forger cette signature.
          </p>
        ),
      },
      {
        id: "security-badge",
        q: "Comment vérifier un badge ?",
        a: (
          <p>
            Scannez le QR code ou cliquez sur le lien de vérification. La page{" "}
            <Link href="/verify" className="text-bt-cyan hover:underline">
              /verify
            </Link>{" "}
            affiche instantanément l&apos;identité certifiée, le TrustScore et le statut
            d&apos;ancrage blockchain.
          </p>
        ),
      },
      {
        id: "security-trustscore",
        q: "Qu'est-ce que le TrustScore ?",
        a: (
          <p>
            Un indicateur de confiance calculé à partir de signaux objectifs : identité vérifiée,
            réseau de confiance, comportement, données techniques. Ce n&apos;est pas une note de
            fiabilité personnelle — c&apos;est un ensemble d&apos;éléments pour évaluer la confiance.
          </p>
        ),
      },
    ],
  },
  {
    title: "Extension Chrome",
    items: [
      {
        id: "extension-install",
        q: "Comment installer l'extension ?",
        a: (
          <p>
            Depuis votre dashboard BLOCKTRUST™, allez dans Extension Chrome, générez votre clé API,
            puis installez l&apos;extension depuis le Chrome Web Store. Elle vérifie automatiquement
            l&apos;identité de vos correspondants dans Gmail.
          </p>
        ),
      },
    ],
  },
  {
    title: "Contact",
    items: [
      {
        id: "contact",
        q: "Comment contacter BLOCKTRUST™ ?",
        a: (
          <p>
            Par email à{" "}
            <a href="mailto:contact@blocktrust.tech" className="text-bt-cyan hover:underline">
              contact@blocktrust.tech
            </a>{" "}
            ou via le formulaire sur notre site. DPO :{" "}
            <a href="mailto:privacy@blocktrust.tech" className="text-bt-cyan hover:underline">
              privacy@blocktrust.tech
            </a>
            .
          </p>
        ),
      },
    ],
  },
];

export default function FaqContent() {
  const [openId, setOpenId] = useState<string | null>(FAQ_SECTIONS[0]?.items[0]?.id ?? null);

  return (
    <section className="mx-auto max-w-3xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-bt-cyan">
          Aide
        </p>
        <h1 className="font-syne text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
          Questions fréquentes
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
          Réponses aux questions les plus courantes sur BLOCKTRUST™, la certification d&apos;identité
          et la protection contre l&apos;usurpation.
        </p>
      </div>

      <div className="mt-12 space-y-10">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="font-syne mb-4 text-lg font-semibold text-white sm:text-xl">
              {section.title}
            </h2>
            <ul className="space-y-3">
              {section.items.map((item) => {
                const isOpen = openId === item.id;
                return (
                  <li
                    key={item.id}
                    id={item.id}
                    className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-bt-cyan/40"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="font-syne text-sm font-semibold text-white sm:text-base">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-bt-cyan transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-0 text-sm leading-relaxed text-white/70 [&_a]:text-bt-cyan">
                        {item.a}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3 border-t border-white/10 pt-10">
        <a
          href="mailto:contact@blocktrust.tech"
          className="inline-block rounded-lg px-5 py-2.5 text-sm font-medium transition-all hover:brightness-110"
          style={{ background: "#00d4ff", color: "#0a1628" }}
        >
          Nous contacter
        </a>
        <Link
          href="/pricing"
          className="inline-block rounded-lg border px-5 py-2.5 text-sm font-medium transition-all hover:brightness-110"
          style={{ borderColor: "var(--bt-border)", color: "var(--bt-cyan)" }}
        >
          Voir les tarifs
        </Link>
      </div>
    </section>
  );
}
