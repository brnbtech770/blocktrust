import Link from "next/link";

const DPO_EMAIL = "privacy@blocktrust.tech";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-white/10 pb-8 last:border-b-0">
      <h2 className="font-syne mb-4 text-xl font-semibold text-[#00d4ff] sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/75 sm:text-base">{children}</div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="ml-4 list-disc pl-1 marker:text-[#00d4ff]/70">{children}</li>;
}

export default function PrivacyContent() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/80">
          BLOCKTRUST™
        </p>
        <h1 className="font-syne text-2xl font-bold leading-tight text-white sm:text-3xl">
          Politique de confidentialité
        </h1>
        <p className="mt-3 text-sm text-white/50">Dernière mise à jour : 27/05/2026</p>
        <p className="mt-4 text-sm leading-relaxed text-white/65">
          La présente politique décrit comment <strong className="text-white/85">BRNB TECH SAS</strong>{" "}
          traite vos données personnelles dans le cadre du service{" "}
          <strong className="text-white/85">BLOCKTRUST™</strong> (blocktrust.tech), conformément au
          Règlement général sur la protection des données (RGPD).
        </p>
      </header>

      <nav
        aria-label="Sommaire"
        className="mb-10 rounded-xl border border-white/10 bg-[#0d1f3c]/60 p-4 text-sm"
      >
        <p className="mb-2 font-semibold text-white/80">Sommaire</p>
        <ol className="grid gap-1.5 text-[#00d4ff]/90 sm:grid-cols-2">
          {[
            ["1", "Identité du responsable"],
            ["2", "Données collectées"],
            ["3", "Finalités et bases légales"],
            ["4", "Données biométriques"],
            ["5", "Extension Chrome TrustScan"],
            ["6", "Durées de conservation"],
            ["7", "Destinataires et sous-traitants"],
            ["8", "Transferts hors UE"],
            ["9", "Cookies et traceurs"],
            ["10", "Vos droits"],
            ["11", "Sécurité et réclamations"],
          ].map(([num, label]) => (
            <li key={num}>
              <a href={`#section-${num}`} className="hover:text-[#00d4ff] hover:underline">
                {num}. {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-8">
        <Section id="section-1" title="1. Identité du responsable de traitement">
          <p>
            <strong className="text-white/90">BRNB TECH SAS</strong>
            <br />
            Adresse : 17 bis Avenue Franklin Roosevelt, 94300 Vincennes
            <br />
            Responsable de traitement : Olivier Bernabé
          </p>
          <p>
            <strong className="text-white/90">Référent à la protection des données personnelles</strong>
            <br />
            Email :{" "}
            <a href={`mailto:${DPO_EMAIL}`} className="text-[#00d4ff] hover:underline">
              {DPO_EMAIL}
            </a>
          </p>
        </Section>

        <Section id="section-2" title="2. Données personnelles collectées">
          <p>Selon votre utilisation de BLOCKTRUST™, nous pouvons traiter les catégories suivantes :</p>
          <ul className="space-y-2">
            <Li>
              <strong className="text-white/85">Données d&apos;identification</strong> : nom, prénom,
              adresse e-mail, identifiants de compte.
            </Li>
            <Li>
              <strong className="text-white/85">Données de connexion</strong> : journaux techniques,
              adresses IP hashées, horodatages, identifiants de session.
            </Li>
            <Li>
              <strong className="text-white/85">Données de vérification</strong> : statut de
              certification, périmètre certifié (e-mails, domaines, téléphones), dates d&apos;émission et
              d&apos;expiration.
            </Li>
            <Li>
              <strong className="text-white/85">Données de facturation et de paiement</strong> : abonnement,
              historique de facturation (les données de carte bancaire sont traitées par Stripe, pas par
              BLOCKTRUST™).
            </Li>
            <Li>
              <strong className="text-white/85">Données biométriques</strong> : uniquement dans le cadre de
              la vérification d&apos;identité via Stripe Identity — voir section 4.
            </Li>
            <Li>
              <strong className="text-white/85">Données extension Chrome TrustScan</strong> : adresse
              e-mail de l&apos;expéditeur Gmail transmise pour vérification — non stockée côté serveur au-delà
              du traitement immédiat (voir section 5).
            </Li>
            <Li>
              <strong className="text-white/85">Données organisationnelles (B2B)</strong> : nom
              d&apos;organisation, rôle, entrées de coffre équipe (BLOCKTRUST™ Vault).
            </Li>
          </ul>
          <p className="rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/5 p-4 text-sm text-white/70">
            <strong className="text-[#00d4ff]">Blockchain :</strong> aucune donnée personnelle n&apos;est
            stockée sur la blockchain. Seuls des certificats cryptographiques non identifiants (empreintes /
            hashes) sont ancrés on-chain sur Polygon Mainnet.
          </p>
        </Section>

        <Section id="section-3" title="3. Finalités et bases légales">
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[320px] text-left text-xs sm:text-sm">
              <thead className="bg-white/[0.04] text-white/55">
                <tr>
                  <th className="px-3 py-2 font-semibold">Finalité</th>
                  <th className="px-3 py-2 font-semibold">Base légale (RGPD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  ["Création et gestion du compte utilisateur", "Exécution du contrat (art. 6.1.b)"],
                  ["Authentification et sécurité du compte", "Exécution du contrat (art. 6.1.b)"],
                  ["Émission, vérification et révocation de certificats", "Exécution du contrat (art. 6.1.b)"],
                  ["Vérification d'identité", "Obligation légale LCB-FT + contrat (art. 6.1.c et b)"],
                  ["TrustScore et signaux de confiance", "Intérêt légitime — sécurité et prévention de la fraude (art. 6.1.f)"],
                  ["Trust Circle et réseau de confiance", "Exécution du contrat (art. 6.1.b)"],
                  ["Facturation et comptabilité", "Exécution du contrat + obligation légale (art. 6.1.b et c)"],
                  ["Extension Chrome TrustScan", "Consentement (art. 6.1.a)"],
                  ["Logs de sécurité, anti-fraude et surveillance", "Intérêt légitime (art. 6.1.f)"],
                  ["Support client et gestion des demandes", "Intérêt légitime (art. 6.1.f)"],
                  ["Cookies analytiques (Vercel Analytics)", "Consentement (art. 6.1.a)"],
                ].map(([purpose, legal]) => (
                  <tr key={purpose}>
                    <td className="px-3 py-2.5 text-white/80">{purpose}</td>
                    <td className="px-3 py-2.5 text-white/60">{legal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-white/55">
            Lorsque le traitement repose sur l&apos;intérêt légitime, vous pouvez vous y opposer (voir
            section 10). Le TrustScore est indicatif et non décisionnel ; vous pouvez le contester depuis
            votre tableau de bord.
          </p>
        </Section>

        <Section id="section-4" title="4. Données biométriques">
          <p>
            La vérification d&apos;identité via <strong className="text-white/85">Stripe Identity</strong>{" "}
            peut impliquer un contrôle de vivacité (liveness) et la comparaison de traits biométriques. Ces
            données sont des <strong className="text-white/85">données sensibles</strong> au sens de
            l&apos;article 9 du RGPD.
          </p>
          <ul className="space-y-2">
            <Li>
              Le traitement biométrique est soumis à votre{" "}
              <strong className="text-white/85">consentement explicite et séparé</strong>, distinct de
              l&apos;acceptation des CGU.
            </Li>
            <Li>
              Les données biométriques sont collectées et traitées par{" "}
              <strong className="text-white/85">Stripe Identity</strong> en qualité de sous-traitant ;
              BLOCKTRUST™ n&apos;en conserve pas de copie sur ses propres serveurs.
            </Li>
            <Li>
              Finalité : vérifier que vous êtes bien la personne déclarée, lutter contre l&apos;usurpation
              d&apos;identité et respecter nos obligations LCB-FT.
            </Li>
            <Li>
              Vous pouvez refuser la vérification biométrique ; certains services (certification avancée)
              pourront alors rester indisponibles.
            </Li>
            <Li>Durée de conservation : 5 ans à compter de la fin de la relation contractuelle (obligations LCB-FT).</Li>
          </ul>
        </Section>

        <Section id="section-5" title="5. Extension Chrome TrustScan">
          <p>
            L&apos;extension <strong className="text-white/85">BLOCKTRUST TrustScan</strong> pour Google
            Chrome fonctionne de manière limitée et transparente :
          </p>
          <ul className="space-y-2">
            <Li>
              L&apos;extension lit <strong className="text-white/85">uniquement l&apos;adresse e-mail de
              l&apos;expéditeur</strong> affichée dans Gmail.
            </Li>
            <Li>
              <strong className="text-white/85">Aucun contenu d&apos;e-mail</strong> (objet, corps, pièces
              jointes) n&apos;est lu, analysé ni stocké.
            </Li>
            <Li>
              L&apos;adresse e-mail de l&apos;expéditeur est transmise à l&apos;API BLOCKTRUST™ pour
              vérification contre vos contacts certifiés.
            </Li>
            <Li>
              Un cache local temporaire (maximum <strong className="text-white/85">5 minutes</strong>) peut
              être utilisé pour limiter les appels réseau.
            </Li>
            <Li>
              Base légale : <strong className="text-white/85">consentement</strong>, matérialisé par
              l&apos;installation volontaire de l&apos;extension et la saisie de votre clé API.
            </Li>
            <Li>
              Vous pouvez retirer votre consentement à tout moment en désinstallant l&apos;extension et en
              révoquant votre clé API depuis les paramètres de votre compte.
            </Li>
          </ul>
        </Section>

        <Section id="section-6" title="6. Durées de conservation">
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[320px] text-left text-xs sm:text-sm">
              <thead className="bg-white/[0.04] text-white/55">
                <tr>
                  <th className="px-3 py-2 font-semibold">Type de données</th>
                  <th className="px-3 py-2 font-semibold">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  ["Compte utilisateur actif", "Durée de la relation contractuelle + 3 ans (prescription)"],
                  ["Sessions et tokens d'authentification", "30 jours maximum"],
                  ["Magic link et reset mot de passe", "24 h / 1 h respectivement"],
                  ["Historique des vérifications", "12 mois, puis anonymisation"],
                  ["Logs de sécurité et anti-fraude", "6 mois"],
                  ["Données de vérification d'identité / biométriques (Stripe Identity)", "5 ans (obligations LCB-FT)"],
                  ["Données de facturation", "10 ans (obligations comptables)"],
                  ["Ancrage blockchain", "Permanent (empreinte non identifiante, immuable par nature)"],
                  ["Cache extension TrustScan", "5 minutes maximum (local, appareil utilisateur)"],
                ].map(([type, duration]) => (
                  <tr key={type}>
                    <td className="px-3 py-2.5 text-white/80">{type}</td>
                    <td className="px-3 py-2.5 text-white/60">{duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-white/55">
            À l&apos;expiration des délais, les données sont supprimées ou anonymisées de manière
            irréversible, sauf obligation légale contraire.
          </p>
        </Section>

        <Section id="section-7" title="7. Destinataires et sous-traitants">
          <p>
            Vos données peuvent être communiquées aux sous-traitants suivants, strictement dans la limite
            de leurs missions et dans le cadre de contrats conformes à l&apos;article 28 du RGPD :
          </p>
          <ul className="space-y-2">
            <Li>
              <strong className="text-white/85">Vercel</strong> — hébergement applicatif (États-Unis / UE)
            </Li>
            <Li>
              <strong className="text-white/85">Neon</strong> — base de données PostgreSQL (UE)
            </Li>
            <Li>
              <strong className="text-white/85">Stripe</strong> — paiements et vérification d&apos;identité
              (Stripe Identity)
            </Li>
            <Li>
              <strong className="text-white/85">Resend</strong> — envoi d&apos;e-mails transactionnels
            </Li>
            <Li>
              <strong className="text-white/85">Upstash</strong> — rate limiting et files de messages
              (QStash)
            </Li>
            <Li>
              <strong className="text-white/85">Alchemy</strong> — accès réseau Polygon (ancrage)
            </Li>
            <Li>
              <strong className="text-white/85">Sentry</strong> — monitoring d&apos;erreurs (production
              uniquement, données minimisées)
            </Li>
            <Li>
              <strong className="text-white/85">Anthropic</strong> — veille cyber (articles publics, sans
              données personnelles utilisateur)
            </Li>
            <Li>
              <strong className="text-white/85">Google</strong> — authentification OAuth (si vous choisissez
              cette méthode de connexion)
            </Li>
          </ul>
          <p className="text-sm text-white/55">
            BLOCKTRUST™ ne vend pas vos données personnelles à des tiers.
          </p>
        </Section>

        <Section id="section-8" title="8. Transferts hors Union européenne">
          <p>
            Certains sous-traitants (notamment <strong className="text-white/85">Vercel</strong> et{" "}
            <strong className="text-white/85">Stripe</strong>) peuvent traiter des données aux États-Unis ou
            dans d&apos;autres pays tiers.
          </p>
          <p>
            Ces transferts sont encadrés par les{" "}
            <strong className="text-white/85">Clauses Contractuelles Types (CCT)</strong> de la Commission
            européenne et/ou le Data Privacy Framework (DPF) lorsque applicable, ainsi que par des mesures
            techniques complémentaires (chiffrement, minimisation).
          </p>
          <p>
            Vous pouvez obtenir une copie des garanties appropriées en contactant{" "}
            <a href={`mailto:${DPO_EMAIL}`} className="text-[#00d4ff] hover:underline">
              {DPO_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section id="section-9" title="9. Cookies et traceurs">
          <p>BLOCKTRUST™ utilise les catégories de cookies suivantes :</p>
          <ul className="space-y-2">
            <Li>
              <strong className="text-white/85">Cookies strictement nécessaires</strong> : session
              d&apos;authentification, sécurité CSRF — base légale : intérêt légitime / exécution du contrat
              ; pas de consentement requis.
            </Li>
            <Li>
              <strong className="text-white/85">Cookies de consentement</strong> : mémorisation de votre
              choix cookie — durée 12 mois.
            </Li>
            <Li>
              <strong className="text-white/85">Cookies analytiques</strong> (Vercel Analytics, Speed
              Insights) : mesure d&apos;audience anonymisée — soumis à votre consentement via la bannière
              cookies.
            </Li>
          </ul>
          <p>
            Vous pouvez à tout moment modifier vos préférences via la bannière cookies ou les paramètres de
            votre navigateur. Le refus des cookies analytiques n&apos;affecte pas l&apos;accès au service.
          </p>
        </Section>

        <Section id="section-10" title="10. Vos droits">
          <p>
            Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants sur vos données
            personnelles :
          </p>
          <ul className="space-y-2">
            <Li>
              <strong className="text-white/85">Droit d&apos;accès</strong> et de rectification
            </Li>
            <Li>
              <strong className="text-white/85">Droit à l&apos;effacement</strong> (« droit à l&apos;oubli
              »)
            </Li>
            <Li>
              <strong className="text-white/85">Droit à la limitation</strong> du traitement
            </Li>
            <Li>
              <strong className="text-white/85">Droit à la portabilité</strong> (export JSON depuis les
              paramètres du compte)
            </Li>
            <Li>
              <strong className="text-white/85">Droit d&apos;opposition</strong> aux traitements fondés sur
              l&apos;intérêt légitime
            </Li>
            <Li>
              <strong className="text-white/85">Droit de retirer votre consentement</strong> à tout moment
              (sans affecter la licéité du traitement antérieur)
            </Li>
            <Li>
              <strong className="text-white/85">Droit de ne pas faire l&apos;objet d&apos;une décision
              automatisée</strong> produisant des effets juridiques (le TrustScore reste contestable)
            </Li>
          </ul>
          <p>
            Pour exercer vos droits, contactez notre DPO :{" "}
            <a href={`mailto:${DPO_EMAIL}`} className="font-medium text-[#00d4ff] hover:underline">
              {DPO_EMAIL}
            </a>
            . Nous répondons sous <strong className="text-white/85">un mois</strong> (prolongeable de deux
            mois si la demande est complexe).
          </p>
          <p>
            Vous pouvez également supprimer votre compte depuis{" "}
            <Link href="/dashboard/settings" className="text-[#00d4ff] hover:underline">
              Paramètres
            </Link>
            .
          </p>
        </Section>

        <Section id="section-11" title="11. Sécurité et réclamations">
          <p>
            BLOCKTRUST™ met en œuvre des mesures techniques et organisationnelles appropriées : chiffrement
            TLS, hachage des adresses IP, authentification sécurisée, contrôle d&apos;accès (IDOR), rate
            limiting, signatures cryptographiques ES256, surveillance des anomalies.
          </p>
          <p>
            En cas de violation de données susceptible d&apos;engendrer un risque pour vos droits, nous
            notifierons la CNIL et, le cas échéant, les personnes concernées conformément à l&apos;article
            33 du RGPD.
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation
            auprès de la{" "}
            <a
              href="https://www.cnil.fr/fr/plaintes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00d4ff] hover:underline"
            >
              CNIL
            </a>{" "}
            (Commission nationale de l&apos;informatique et des libertés).
          </p>
          <p>
            Pour toute question relative à cette politique :{" "}
            <a href={`mailto:${DPO_EMAIL}`} className="font-medium text-[#00d4ff] hover:underline">
              {DPO_EMAIL}
            </a>
          </p>
        </Section>
      </div>

      <footer className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-[#00d4ff] hover:underline">
          ← Retour à l&apos;accueil
        </Link>
        <Link href="/cgu" className="hover:text-white/70 hover:underline">
          Conditions générales d&apos;utilisation
        </Link>
      </footer>
    </article>
  );
}
