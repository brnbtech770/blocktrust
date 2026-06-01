// emails/DiscoveryReminderJ7.tsx
// Rappel Découverte J-7 : plus que 7 jours de période gratuite
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

export const subject = 'Plus que 7 jours pour découvrir BLOCKTRUST™'

type DiscoveryReminderJ7Props = {
  userName?: string | null
  pricingUrl: string
}

export function DiscoveryReminderJ7({ userName, pricingUrl }: DiscoveryReminderJ7Props) {
  const displayName = userName || 'Utilisateur'
  return (
    <Html>
      <Head />
      <Preview>Plus que 7 jours de période découverte BLOCKTRUST™</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Plus que 7 jours de découverte</Heading>
          <Text style={text}>Bonjour {displayName},</Text>
          <Text style={text}>
            Votre période <strong>Découverte gratuite</strong> sur BLOCKTRUST™ se termine dans{' '}
            <strong>7 jours</strong>. Vous avez pu créer votre badge, ajouter vos contacts et tester
            les vérifications d&apos;identité.
          </Text>
          <Text style={text}>
            Pour conserver l&apos;accès et activer votre <strong>certification sur la
            blockchain</strong>, passez à une formule à partir de 2,99€/mois.
          </Text>
          <Section style={buttonContainer}>
            <Link href={pricingUrl} style={button}>
              Voir les formules
            </Link>
          </Section>
          <Text style={muted}>
            Aucune action n&apos;est requise immédiatement — vos données restent conservées.
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
