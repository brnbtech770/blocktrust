"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import PricingToggle from "@/app/components/pricing/PricingToggle";
import {
  formatPriceFr,
  getPlanB2BById,
  getPlanB2CById,
  getPlanPerMonthAmount,
} from "@/lib/pricing";

type FaqMode = "B2C" | "B2B";

type FaqItem = { id: string; q: string; a: ReactNode };
type FaqSection = { title: string; items: FaqItem[] };

function buildB2CSections(): FaqSection[] {
  const essentiel = getPlanB2CById("ESSENTIEL");
  const entryPrice =
    essentiel?.prices != null
      ? formatPriceFr(getPlanPerMonthAmount(essentiel, "yearly") ?? 0)
      : formatPriceFr(2.99);

  return [
    {
      title: "Général",
      items: [
        {
          id: "b2c-general-what",
          q: "Qu'est-ce que BLOCKTRUST™ ?",
          a: (
            <p>
              BLOCKTRUST™ certifie votre identité numérique et protège vos échanges contre
              l&apos;usurpation et le phishing. Vous prouvez qui vous êtes, et vous vérifiez à qui
              vous avez affaire.
            </p>
          ),
        },
        {
          id: "b2c-general-free",
          q: "C'est gratuit ?",
          a: (
            <p>
              Le plan Découverte est gratuit, sans carte bancaire. Il vous donne un badge
              d&apos;identité, 5 contacts et 20 vérifications par mois. Les plans payants
              démarrent à {entryPrice}&nbsp;€/mois.
            </p>
          ),
        },
        {
          id: "b2c-general-how",
          q: "Comment ça marche concrètement ?",
          a: (
            <p>
              Vous créez votre compte, votre identité est vérifiée, puis un badge certifié vous est
              attribué. Ce badge accompagne vos emails, votre site et vos signatures. Quiconque le
              scanne ou clique sur le lien confirme votre identité en direct.
            </p>
          ),
        },
      ],
    },
    {
      title: "Sécurité",
      items: [
        {
          id: "b2c-security-phishing",
          q: "Comment BLOCKTRUST™ me protège du phishing ?",
          a: (
            <p>
              Quand vous recevez un email, vous pouvez vérifier instantanément si l&apos;expéditeur
              possède un badge certifié BLOCKTRUST™. Pas de badge = prudence. L&apos;extension Chrome
              fait cette vérification automatiquement dans Gmail.
            </p>
          ),
        },
        {
          id: "security-bis",
          q: "Qu'est-ce qu'une signature BIS ?",
          a: (
            <p>
              La Signature d&apos;Interaction BLOCKTRUST™ (BIS) prouve qu&apos;un email, un document
              ou un paiement provient bien de la personne certifiée. Même si sa boîte email est
              piratée, un attaquant ne peut pas forger cette signature. C&apos;est la protection la
              plus avancée contre la fraude par usurpation.
            </p>
          ),
        },
        {
          id: "b2c-security-trustscore",
          q: "Qu'est-ce que le TrustScore ?",
          a: (
            <p>
              Un indicateur calculé à partir de signaux objectifs : identité vérifiée, réseau de
              confiance, historique d&apos;interactions. Ce n&apos;est pas une note de fiabilité —
              ce sont des éléments factuels pour vous aider à évaluer la confiance.
            </p>
          ),
        },
        {
          id: "b2c-security-blockchain",
          q: "Qu'est-ce que l'ancrage blockchain ?",
          a: (
            <p>
              Votre badge est ancré sur la blockchain Polygon — une preuve d&apos;existence
              infalsifiable et horodatée, vérifiable publiquement. Personne ne peut modifier ou
              antidater votre certification.
            </p>
          ),
        },
      ],
    },
    {
      title: "Mon compte",
      items: [
        {
          id: "b2c-account-extension",
          q: "Comment installer l'extension Chrome ?",
          a: (
            <p>
              Depuis votre dashboard, allez dans &laquo;&nbsp;Extension Chrome&nbsp;&raquo;, générez
              votre clé API, puis installez l&apos;extension depuis le Chrome Web Store. Elle vérifie
              automatiquement l&apos;identité de vos correspondants dans Gmail.
            </p>
          ),
        },
        {
          id: "b2c-account-plans",
          q: "Quelles sont les différences entre les plans ?",
          a: (
            <p>
              Découverte (gratuit) = badge d&apos;identité basique. Essentiel = badge ancré
              blockchain. Premium = cercle de confiance + signatures BIS. Famille = jusqu&apos;à 5
              profils protégés.{" "}
              <Link href="/pricing" className="text-bt-cyan hover:underline">
                Voir le détail sur la page tarifs
              </Link>
              .
            </p>
          ),
        },
        {
          id: "b2c-account-verify",
          q: "Comment vérifier un badge ?",
          a: (
            <p>
              Scannez le QR code ou cliquez sur le lien de vérification. La page affiche
              instantanément l&apos;identité certifiée, le TrustScore et le statut d&apos;ancrage.
            </p>
          ),
        },
      ],
    },
    {
      title: "Contact",
      items: [
        {
          id: "b2c-contact",
          q: "Comment contacter BLOCKTRUST™ ?",
          a: (
            <p>
              Par email à{" "}
              <a href="mailto:contact@blocktrust.tech" className="text-bt-cyan hover:underline">
                contact@blocktrust.tech
              </a>
              . DPO :{" "}
              <a href="mailto:privacy@blocktrust.tech" className="text-bt-cyan hover:underline">
                privacy@blocktrust.tech
              </a>
              .
            </p>
          ),
        },
        {
          id: "b2c-contact-privacy",
          q: "Mes données sont-elles protégées ?",
          a: (
            <p>
              Oui. BLOCKTRUST™ est conforme au RGPD, hébergé en Europe, avec minimisation des
              données. Aucune donnée de vos emails n&apos;est lue ni stockée par l&apos;extension
              Chrome.{" "}
              <Link href="/privacy" className="text-bt-cyan hover:underline">
                Voir notre politique de confidentialité
              </Link>
              .
            </p>
          ),
        },
      ],
    },
  ];
}

function buildB2BSections(): FaqSection[] {
  const starter = getPlanB2BById("STARTER");
  const team = getPlanB2BById("TEAM");
  const starterMonthly =
    starter?.prices != null
      ? formatPriceFr(getPlanPerMonthAmount(starter, "monthly") ?? 0)
      : formatPriceFr(12.99);
  const teamMonthly =
    team?.prices != null
      ? formatPriceFr(getPlanPerMonthAmount(team, "monthly") ?? 0)
      : formatPriceFr(8.99);

  return [
    {
      title: "Général",
      items: [
        {
          id: "b2b-general-why",
          q: "Pourquoi certifier mon entreprise avec BLOCKTRUST™ ?",
          a: (
            <p>
              Vos clients et partenaires vérifient en un instant que vos communications sont
              authentiques. Fini la fraude au président, les faux RIB et l&apos;usurpation
              d&apos;identité de vos collaborateurs.
            </p>
          ),
        },
        {
          id: "b2b-general-who",
          q: "Quelles entreprises utilisent BLOCKTRUST™ ?",
          a: (
            <p>
              PME, professions libérales (notaires, avocats, experts-comptables), agences
              immobilières, startups, e-commerce — toute organisation qui échange par email avec
              des clients ou partenaires.
            </p>
          ),
        },
        {
          id: "b2b-general-team",
          q: "Comment ça fonctionne pour une équipe ?",
          a: (
            <p>
              Le plan Team (2-10 utilisateurs) donne à chaque collaborateur son propre badge certifié.
              L&apos;administrateur gère les accès, les rôles et consulte les audit logs depuis le
              dashboard.
            </p>
          ),
        },
      ],
    },
    {
      title: "Sécurité entreprise",
      items: [
        {
          id: "b2b-security-president",
          q: "Comment BLOCKTRUST™ protège contre la fraude au président ?",
          a: (
            <p>
              Chaque collaborateur certifié peut signer ses interactions (BIS). Si un email
              demandant un virement ne porte pas de signature BIS, votre équipe sait immédiatement
              qu&apos;il faut vérifier par un autre canal — même si l&apos;email semble venir du bon
              expéditeur.
            </p>
          ),
        },
        {
          id: "b2b-security-trustcircle",
          q: "Qu'est-ce que le Trust Circle ?",
          a: (
            <p>
              Un réseau fermé de contacts de confiance vérifiés. Vos partenaires, fournisseurs et
              clients certifiés sont reliés dans un cercle auditable. Toute tentative d&apos;usurpation
              d&apos;un membre déclenche une alerte immédiate.
            </p>
          ),
        },
        {
          id: "b2b-security-bis-docs",
          q: "Les signatures BIS fonctionnent-elles pour les documents ?",
          a: (
            <p>
              Oui. Emails, contrats, factures, mandats, demandes de paiement — chaque document peut
              être signé et vérifié. Le contenu n&apos;est jamais envoyé à nos serveurs : seule
              l&apos;empreinte numérique (hash SHA-256) est utilisée pour la signature.
            </p>
          ),
        },
      ],
    },
    {
      title: "Tarifs & intégration",
      items: [
        {
          id: "b2b-pricing",
          q: "Quels sont les tarifs entreprise ?",
          a: (
            <p>
              Starter : {starterMonthly}&nbsp;€ HT/mois/utilisateur. Team : {teamMonthly}&nbsp;€
              HT/mois/utilisateur (2-10 utilisateurs). Enterprise : sur devis (51+ utilisateurs,
              SSO/SAML, API, marque blanche).{" "}
              <Link href="/pricing?tab=entreprises" className="text-bt-cyan hover:underline">
                Voir le détail sur la page tarifs
              </Link>
              .
            </p>
          ),
        },
        {
          id: "b2b-api",
          q: "L'API est-elle disponible ?",
          a: (
            <p>
              L&apos;API complète est disponible sur le plan Enterprise. Contactez-nous à{" "}
              <a href="mailto:commercial@blocktrust.tech" className="text-bt-cyan hover:underline">
                commercial@blocktrust.tech
              </a>{" "}
              pour une démonstration.
            </p>
          ),
        },
        {
          id: "b2b-rgpd",
          q: "BLOCKTRUST™ est-il conforme RGPD ?",
          a: (
            <p>
              Oui. Hébergement européen (Vercel EU, Neon EU), minimisation des données, registre des
              traitements, DPO désigné (
              <a href="mailto:privacy@blocktrust.tech" className="text-bt-cyan hover:underline">
                privacy@blocktrust.tech
              </a>
              ), DPIA réalisée. Nos sous-traitants sont documentés dans notre{" "}
              <Link href="/privacy" className="text-bt-cyan hover:underline">
                politique de confidentialité
              </Link>
              .
            </p>
          ),
        },
        {
          id: "b2b-contact-sales",
          q: "Comment contacter l'équipe commerciale ?",
          a: (
            <p>
              Par email à{" "}
              <a href="mailto:commercial@blocktrust.tech" className="text-bt-cyan hover:underline">
                commercial@blocktrust.tech
              </a>{" "}
              ou via le formulaire Enterprise sur la{" "}
              <Link href="/pricing?tab=entreprises#compare" className="text-bt-cyan hover:underline">
                page tarifs
              </Link>
              .
            </p>
          ),
        },
      ],
    },
  ];
}

function FaqAccordion({
  sections,
  openId,
  setOpenId,
}: {
  sections: FaqSection[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
}) {
  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="font-syne text-balance mb-4 text-lg font-semibold text-white sm:text-xl">
            {section.title}
          </h2>
          <ul className="space-y-3">
            {section.items.map((item) => {
              const isOpen = openId === item.id;
              return (
                <li
                  key={item.id}
                  id={item.id}
                  className="scroll-mt-24 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-bt-cyan/40"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-syne text-balance text-sm font-semibold text-white sm:text-base">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-bt-cyan transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                  {isOpen ? (
                    <div className="px-5 pb-4 pt-0 text-sm leading-relaxed text-white/70 [&_a]:text-bt-cyan [&_a]:underline-offset-2 [&_a]:hover:underline">
                      {item.a}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function FaqContent() {
  const [mode, setMode] = useState<FaqMode>("B2C");
  const [openIdB2C, setOpenIdB2C] = useState<string | null>("b2c-general-what");
  const [openIdB2B, setOpenIdB2B] = useState<string | null>("b2b-general-why");

  const b2cSections = useMemo(() => buildB2CSections(), []);
  const b2bSections = useMemo(() => buildB2BSections(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab")?.toLowerCase();
    const hash = window.location.hash.replace("#", "").toLowerCase();

    if (tab === "entreprises" || tab === "b2b" || hash === "entreprises" || hash === "b2b") {
      setMode("B2B");
    }

    if (hash === "security-bis") {
      setMode("B2C");
      setOpenIdB2C("security-bis");
      requestAnimationFrame(() => {
        document.getElementById("security-bis")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const sections = mode === "B2C" ? b2cSections : b2bSections;
  const openId = mode === "B2C" ? openIdB2C : openIdB2B;
  const setOpenId = mode === "B2C" ? setOpenIdB2C : setOpenIdB2B;

  return (
    <section className="mx-auto max-w-3xl px-4 pb-16 pt-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-syne text-balance mx-auto max-w-3xl text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
          Questions fréquentes
        </h1>
        <p className="text-balance mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
          Trouvez rapidement les réponses à vos questions.
        </p>
      </div>

      <div className="mt-8 sm:mt-10">
        <PricingToggle mode={mode} setMode={setMode} />
      </div>

      <div className="mt-2" role="tabpanel" aria-label={mode === "B2C" ? "FAQ particuliers" : "FAQ entreprises"}>
        <FaqAccordion sections={sections} openId={openId} setOpenId={setOpenId} />
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3 border-t border-white/10 pt-10">
        <a
          href={mode === "B2B" ? "mailto:commercial@blocktrust.tech" : "mailto:contact@blocktrust.tech"}
          className="inline-block cursor-pointer rounded-lg px-5 py-2.5 text-sm font-medium transition-all hover:brightness-110"
          style={{ background: "#00d4ff", color: "#0a1628" }}
        >
          {mode === "B2B" ? "Contactez-nous" : "Nous contacter"}
        </a>
        <Link
          href={mode === "B2B" ? "/pricing?tab=entreprises" : "/pricing"}
          className="inline-block cursor-pointer rounded-lg border px-5 py-2.5 text-sm font-medium transition-all hover:brightness-110"
          style={{ borderColor: "var(--bt-border)", color: "var(--bt-cyan)" }}
        >
          Voir les tarifs
        </Link>
      </div>
    </section>
  );
}
