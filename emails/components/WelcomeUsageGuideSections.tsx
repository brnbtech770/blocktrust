// emails/components/WelcomeUsageGuideSections.tsx
// Sections guide d'utilisation — email bienvenue + trial Premium
// ============================================================

import { Hr, Link, Section, Text } from '@react-email/components'
import * as React from 'react'

export const CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/bemcnlbifffejlijnndkdgcjpmijfaeg'

export type WelcomeUsageGuideSectionsProps = {
  dashboardUrl: string
  chromeStoreUrl?: string
  extensionUrl: string
  contactsUrl: string
  bisUrl: string
  badgeVerifyUrl?: string | null
}

export function WelcomeUsageGuideSections({
  dashboardUrl,
  chromeStoreUrl = CHROME_WEB_STORE_URL,
  extensionUrl,
  contactsUrl,
  bisUrl,
  badgeVerifyUrl,
}: WelcomeUsageGuideSectionsProps) {
  return (
    <>
      <Text style={intro}>
        Voici comment tirer le meilleur de BLOCKTRUST en 5 minutes :
      </Text>

      <Hr style={divider} />

      <Section style={stepBlock}>
        <Text style={stepTitle}>1️⃣ Installez l&apos;extension Chrome</Text>
        <Text style={stepLead}>
          Protégez vos emails dans Gmail automatiquement :
        </Text>
        <Text style={stepItem}>
          → Installez TrustScan :{' '}
          <Link href={chromeStoreUrl} style={link}>
            Chrome Web Store
          </Link>
        </Text>
        <Text style={stepItem}>
          → Dans votre dashboard, allez dans « Extensions » :{' '}
          <Link href={extensionUrl} style={link}>
            {extensionUrl}
          </Link>
        </Text>
        <Text style={stepItem}>→ Cliquez « Générer ma clé API » puis « Copier la clé »</Text>
        <Text style={stepItem}>→ Collez-la dans l&apos;extension TrustScan</Text>
        <Text style={result}>
          <strong>Résultat :</strong> un badge vert ou gris apparaît à côté de chaque expéditeur
          dans Gmail. Vous savez immédiatement si votre correspondant est certifié.
        </Text>
      </Section>

      <Hr style={divider} />

      <Section style={stepBlock}>
        <Text style={stepTitle}>2️⃣ Partagez votre badge</Text>
        <Text style={stepLead}>
          Votre badge certifié est votre preuve d&apos;identité numérique.
        </Text>
        <Text style={stepItem}>→ Copiez votre lien de vérification depuis le dashboard</Text>
        {badgeVerifyUrl ? (
          <Text style={stepItem}>
            → Votre lien :{' '}
            <Link href={badgeVerifyUrl} style={link}>
              {badgeVerifyUrl}
            </Link>
          </Text>
        ) : null}
        <Text style={stepItem}>→ Ajoutez-le dans votre signature email</Text>
        <Text style={stepItem}>→ Vos contacts peuvent vérifier que c&apos;est bien vous</Text>
        <Text style={useCase}>
          <strong>Cas d&apos;usage :</strong> vous êtes agent immobilier et envoyez un compromis.
          Votre client clique votre lien → il voit que vous êtes certifié. Confiance établie
          instantanément.
        </Text>
      </Section>

      <Hr style={divider} />

      <Section style={stepBlock}>
        <Text style={stepTitle}>3️⃣ Ajoutez vos contacts</Text>
        <Text style={stepLead}>3 niveaux de relation :</Text>
        <Text style={stepItem}>
          <strong>Contact simple</strong> — vous le référencez
        </Text>
        <Text style={stepItem}>
          <strong>Contact vérifié</strong> — il est certifié BLOCKTRUST™
        </Text>
        <Text style={stepItem}>
          <strong>Trust Circle</strong> — confiance réciproque (Premium)
        </Text>
        <Text style={stepItem}>
          →{' '}
          <Link href={contactsUrl} style={link}>
            Gérer mes contacts
          </Link>
        </Text>
        <Text style={useCase}>
          <strong>Cas d&apos;usage :</strong> vous recevez un nouveau RIB de votre fournisseur.
          S&apos;il est dans votre réseau certifié → RIB fiable. S&apos;il n&apos;est pas certifié
          → vérifiez avant de payer.
        </Text>
      </Section>

      <Hr style={divider} />

      <Section style={stepBlock}>
        <Text style={stepTitle}>4️⃣ Signez vos interactions (BIS)</Text>
        <Text style={stepLead}>Pour les emails et documents importants :</Text>
        <Text style={stepItem}>
          → Dashboard → Signatures BIS →{' '}
          <Link href={bisUrl} style={link}>
            Nouvelle signature
          </Link>
        </Text>
        <Text style={stepItem}>→ Choisissez le type (Email, Document, Contrat)</Text>
        <Text style={stepItem}>→ Le destinataire reçoit une notification vérifiable</Text>
        <Text style={stepLead}>Avec l&apos;extension Chrome (mode automatique ou sélectif) :</Text>
        <Text style={stepItem}>→ Vos emails Gmail sont signés en un clic</Text>
        <Text style={stepItem}>
          → Le bloc de vérification est inséré automatiquement
        </Text>
        <Text style={useCase}>
          <strong>Cas d&apos;usage :</strong> vous envoyez un contrat à signer. Vous signez
          l&apos;interaction avec BIS. Le destinataire reçoit une notification et peut vérifier que
          le contrat n&apos;a pas été modifié et que c&apos;est bien vous l&apos;expéditeur.
        </Text>
      </Section>

      <Hr style={divider} />

      <Section style={stepBlock}>
        <Text style={stepTitle}>5️⃣ TrustScore &amp; réseau de confiance</Text>
        <Text style={stepLead}>
          Votre TrustScore (sur 100) reflète votre niveau de confiance numérique : identité,
          réseau, comportement et signaux techniques.
        </Text>
        <Text style={stepItem}>→ Vérifiez votre identité (KYC) pour gagner des points</Text>
        <Text style={stepItem}>→ Développez votre Trust Circle et signez avec BIS</Text>
        <Text style={stepItem}>
          → Consultez votre score sur{' '}
          <Link href={dashboardUrl} style={link}>
            votre dashboard
          </Link>
        </Text>
        <Text style={useCase}>
          <strong>Cas d&apos;usage :</strong> un TrustScore élevé rassure vos clients et partenaires
          — identité vérifiée, réseau actif, interactions signées.
        </Text>
      </Section>

      <Hr style={divider} />

      <Section style={stepBlock}>
        <Text style={stepTitle}>6️⃣ Vault — coffre-fort &amp; détection fraude RIB</Text>
        <Text style={stepLead}>
          Stockez vos RIB et données sensibles en référence sécurisée.
        </Text>
        <Text style={stepItem}>
          → Stockez le RIB de vos fournisseurs dans le Vault
        </Text>
        <Text style={stepItem}>
          → Comparez automatiquement tout « nouveau RIB » reçu par email
        </Text>
        <Text style={stepItem}>
          →{' '}
          <Link href={`${dashboardUrl.replace(/\/dashboard\/?$/, '')}/dashboard/vault`} style={link}>
            Ouvrir le Vault
          </Link>
        </Text>
        <Text style={useCase}>
          <strong>Cas d&apos;usage :</strong> un email avec un RIB modifié ne correspond pas à la
          référence Vault → alerte fraude, virement frauduleux évité.
        </Text>
      </Section>

      <Hr style={divider} />

      <Section style={stepBlock}>
        <Text style={stepTitle}>7️⃣ Protection domaines &amp; sites web</Text>
        <Text style={stepLead}>
          BLOCKTRUST détecte le typosquatting et vérifie la réputation des domaines avant que vous
          cliquiez.
        </Text>
        <Text style={stepItem}>→ Certifiez votre domaine pour prouver que votre site est le vrai</Text>
        <Text style={stepItem}>→ L&apos;extension Chrome signale les domaines suspects</Text>
        <Text style={stepItem}>
          → Vérifiez un domaine sur{' '}
          <Link href={`${dashboardUrl.replace(/\/dashboard\/?$/, '')}/verify`} style={link}>
            blocktrust.tech/verify
          </Link>
        </Text>
        <Text style={useCase}>
          <strong>Cas d&apos;usage :</strong> un site miroir imite votre domaine — la vérification
          BLOCKTRUST alerte et indique le domaine certifié authentique.
        </Text>
      </Section>

      <Hr style={divider} />

      <Section style={dashboardBlock}>
        <Text style={stepTitle}>📱 Votre dashboard</Text>
        <Text style={stepItem}>
          →{' '}
          <Link href={dashboardUrl} style={linkBold}>
            {dashboardUrl}
          </Link>
        </Text>
      </Section>
    </>
  )
}

const intro = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}

const divider = {
  borderColor: '#00d4ff',
  borderWidth: '1px 0 0 0',
  margin: '20px 0',
}

const stepBlock = {
  margin: '0 0 4px',
}

const stepTitle = {
  color: '#0a1628',
  fontSize: '16px',
  fontWeight: '700' as const,
  lineHeight: '24px',
  margin: '0 0 10px',
}

const stepLead = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 8px',
}

const stepItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 6px',
}

const result = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '12px 0 0',
  padding: '10px 12px',
  backgroundColor: '#f0fdfa',
  borderRadius: '8px',
}

const useCase = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '12px 0 0',
  padding: '10px 12px',
  backgroundColor: '#faf8f3',
  borderLeft: '3px solid #BDA76B',
  borderRadius: '4px',
}

const dashboardBlock = {
  margin: '0 0 8px',
}

const link = {
  color: '#0a1628',
  textDecoration: 'underline',
}

const linkBold = {
  color: '#0a1628',
  fontWeight: '700' as const,
  textDecoration: 'underline',
}
