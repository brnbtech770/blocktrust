// emails/DiscoveryExpired.tsx
// Période Découverte terminée : compte gelé en lecture seule, mur d'upgrade
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

export const subject = 'Votre période découverte est terminée'

type DiscoveryExpiredProps = {
  userName?: string | null
  pricingUrl: string
}

export function DiscoveryExpired({ userName, pricingUrl }: DiscoveryExpiredProps) {
  const displayName = userName || 'Utilisateur'
  return (
    <Html>
      <Head />
      <Preview>Votre période découverte BLOCKTRUST™ de 30 jours est terminée</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Votre période découverte est terminée</Heading>
          <Text style={text}>Bonjour {displayName},</Text>
          <Text style={text}>
            Votre période <strong>Découverte gratuite de 30 jours</strong> sur BLOCKTRUST™ vient de
            se terminer. Votre badge preview est désormais désactivé et les vérifications sont en
            pause.
          </Text>
          <Text style={text}>
            <strong>Bonne nouvelle :</strong> vos données (badge, contacts) sont intégralement
            conservées. Activez votre certification dès <strong>2,99€/mois</strong> pour tout
            réactiver immédiatement et ancrer votre identité sur la blockchain.
          </Text>
          <Section style={buttonContainer}>
            <Link href={pricingUrl} style={button}>
              Activer ma certification
            </Link>
          </Section>
          <Text style={muted}>
            Vous reprenez exactement là où vous vous étiez arrêté, sans rien ressaisir.
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
  backgroundColor: '#BDA76B',
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
