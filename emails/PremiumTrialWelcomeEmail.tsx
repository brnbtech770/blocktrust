// emails/PremiumTrialWelcomeEmail.tsx
// Bienvenue trial Premium 3 mois — ambassadeurs / beta
// Charte BLOCKTRUST™ — navy #0a1628, cyan #00d4ff
// ============================================================

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { CertifiedEmailFooter } from './components/CertifiedEmailFooter'
import {
  CHROME_WEB_STORE_URL,
  WelcomeUsageGuideSections,
} from './components/WelcomeUsageGuideSections'

export const premiumTrialWelcomeSubject =
  'Bienvenue dans BLOCKTRUST™ Premium — 3 mois offerts'

export type PremiumTrialWelcomeEmailProps = {
  firstName: string
  trialEndsAt: string
  dashboardUrl: string
  pricingUrl: string
  badgeVerifyUrl?: string | null
}

export function PremiumTrialWelcomeEmail({
  firstName,
  trialEndsAt,
  dashboardUrl,
  pricingUrl,
  badgeVerifyUrl,
}: PremiumTrialWelcomeEmailProps) {
  const base = dashboardUrl.replace(/\/dashboard\/?$/, '')
  const extensionUrl = `${base}/dashboard/extension`
  const contactsUrl = `${base}/dashboard/entities`
  const bisUrl = `${base}/dashboard/bis`

  return (
    <Html>
      <Head />
      <Preview>3 mois de BLOCKTRUST™ Premium offerts — badge certifié, Trust Circle, BIS</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Bienvenue dans BLOCKTRUST™ Premium</Heading>
          <Text style={text}>Bonjour {firstName},</Text>
          <Text style={text}>
            Vous bénéficiez de BLOCKTRUST™ Premium gratuitement pendant 3 mois.
          </Text>
          <Text style={text}>
            Votre badge certifié est actif et ancré sur la blockchain Polygon. Voici ce que vous
            pouvez faire dès maintenant :
          </Text>

          <Section style={featureBlock}>
            <Text style={featureTitle}>Badge certifié ancré</Text>
            <Text style={featureText}>
              Votre identité numérique est certifiée et vérifiable par tous, même sans compte
              BLOCKTRUST. Partagez votre lien de vérification ou votre QR code.
            </Text>
          </Section>

          <Section style={featureBlock}>
            <Text style={featureTitle}>Trust Circle</Text>
            <Text style={featureText}>
              Créez votre réseau de confiance. Ajoutez vos contacts de confiance et établissez des
              relations mutuelles vérifiées.
            </Text>
          </Section>

          <Section style={featureBlock}>
            <Text style={featureTitle}>Signatures BIS (BlockTrust Interaction Signature)</Text>
            <Text style={featureText}>
              Signez vos emails, documents et contrats avec une signature cryptographique
              infalsifiable. Vos destinataires peuvent vérifier l&apos;authenticité de chaque
              interaction.
            </Text>
          </Section>

          <Section style={featureBlock}>
            <Text style={featureTitle}>100 contacts + vérifications illimitées</Text>
            <Text style={featureText}>
              Ajoutez jusqu&apos;à 100 contacts et vérifiez autant d&apos;identités que vous le
              souhaitez.
            </Text>
          </Section>

          <Heading as="h2" style={h2}>
            Guide de démarrage
          </Heading>

          <WelcomeUsageGuideSections
            dashboardUrl={dashboardUrl}
            chromeStoreUrl={CHROME_WEB_STORE_URL}
            extensionUrl={extensionUrl}
            contactsUrl={contactsUrl}
            bisUrl={bisUrl}
            badgeVerifyUrl={badgeVerifyUrl}
          />

          <Section style={buttonContainer}>
            <Link href={dashboardUrl} style={button}>
              Accéder au tableau de bord
            </Link>
          </Section>

          <Text style={text}>
            Votre période Premium se termine le {trialEndsAt}. Vous recevrez un email avant cette
            date pour choisir votre formule.
          </Text>
          <Text style={muted}>
            Découvrir les tarifs :{' '}
            <Link href={pricingUrl} style={link}>
              blocktrust.tech/pricing
            </Link>
          </Text>

          <Hr style={hr} />
          <Text style={text}>
            Des questions ? Contactez-nous à{' '}
            <Link href="mailto:contact@blocktrust.tech" style={link}>
              contact@blocktrust.tech
            </Link>
          </Text>
          <Text style={tagline}>
            La preuve que c&apos;est vous. La certitude que c&apos;est eux.
          </Text>
          <Text style={signature}>L&apos;équipe BLOCKTRUST™</Text>
          <CertifiedEmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f3f4f6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
}
const h1 = {
  color: '#0a1628',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 20px',
}
const h2 = {
  color: '#0a1628',
  fontSize: '16px',
  fontWeight: '700',
  margin: '24px 0 12px',
}
const text = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 14px',
}
const featureBlock = {
  margin: '0 0 12px',
  padding: '12px 14px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  borderLeft: '3px solid #00d4ff',
}
const featureTitle = {
  color: '#0a1628',
  fontSize: '14px',
  fontWeight: '700',
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.02em',
}
const featureText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}
const muted = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 14px',
}
const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}
const button = {
  backgroundColor: '#00d4ff',
  color: '#0a1628',
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '700',
  fontSize: '15px',
}
const link = {
  color: '#0a1628',
  textDecoration: 'underline',
}
const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}
const tagline = {
  color: '#0a1628',
  fontSize: '14px',
  fontWeight: '600',
  fontStyle: 'italic',
  margin: '16px 0 8px',
}
const signature = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0',
}
