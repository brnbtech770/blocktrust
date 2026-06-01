// emails/DiscoveryReminderJ2.tsx
// Rappel Découverte J-2 : la période gratuite expire dans 2 jours
// Charte BLOCKTRUST™ — navy #0a1628, cyan #00d4ff, gold #BDA76B
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

export const subject = 'Votre découverte expire dans 2 jours'

type DiscoveryReminderJ2Props = {
  userName?: string | null
  pricingUrl: string
}

export function DiscoveryReminderJ2({ userName, pricingUrl }: DiscoveryReminderJ2Props) {
  const displayName = userName || 'Utilisateur'
  return (
    <Html>
      <Head />
      <Preview>Votre période découverte BLOCKTRUST™ expire dans 2 jours</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Votre découverte expire dans 2 jours</Heading>
          <Text style={text}>Bonjour {displayName},</Text>
          <Text style={text}>
            Il vous reste <strong>2 jours</strong> avant la fin de votre période{' '}
            <strong>Découverte gratuite</strong>. Passé ce délai, votre badge preview sera désactivé
            et les vérifications seront mises en pause.
          </Text>
          <Text style={text}>
            Activez votre <strong>certification sur la blockchain</strong> dès maintenant à partir de
            2,99€/mois pour ne rien perdre.
          </Text>
          <Section style={buttonContainer}>
            <Link href={pricingUrl} style={button}>
              Activer ma certification
            </Link>
          </Section>
          <Text style={muted}>
            Vos données (badge, contacts) restent conservées même après l&apos;expiration.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            BLOCKTRUST™ — Certifié · Protégé · Infalsifiable. Une question ?{' '}
            <Link href="mailto:support@blocktrust.tech" style={linkFooter}>
              support@blocktrust.tech
            </Link>
          </Text>
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
const text = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 14px',
}
const muted = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '4px 0 0',
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
const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}
const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '18px',
}
const linkFooter = {
  color: '#0a1628',
  textDecoration: 'underline',
}
