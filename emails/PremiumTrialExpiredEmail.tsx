// emails/PremiumTrialExpiredEmail.tsx
// Fin de période d'essai Premium — downgrade Découverte
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

export const premiumTrialExpiredSubject =
  'Votre période d\'essai Premium est terminée'

export type PremiumTrialExpiredEmailProps = {
  firstName: string
  pricingUrl: string
}

export function PremiumTrialExpiredEmail({ firstName, pricingUrl }: PremiumTrialExpiredEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre essai Premium BLOCKTRUST™ est terminé — continuez avec un abonnement payant</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Votre période d&apos;essai Premium est terminée</Heading>
          <Text style={text}>Bonjour {firstName},</Text>
          <Text style={text}>
            Votre période d&apos;essai <strong>BLOCKTRUST™ Premium</strong> gratuite est terminée.
            Votre compte repasse sur le plan <strong>Découverte</strong>.
          </Text>
          <Text style={text}>
            Vos données (badge, contacts, historique) sont conservées. Pour retrouver Trust Circle,
            les signatures BIS, 100 contacts et les vérifications illimitées, choisissez un
            abonnement payant.
          </Text>
          <Section style={buttonContainer}>
            <Link href={pricingUrl} style={button}>
              Voir les formules Premium
            </Link>
          </Section>
          <Text style={muted}>À partir de 3,99€/mois · Sans engagement · Résiliable à tout moment</Text>
          <Hr style={hr} />
          <Text style={footer}>
            BLOCKTRUST™ — Certifié · Protégé · Infalsifiable. Une question ?{' '}
            <Link href="mailto:contact@blocktrust.tech" style={linkFooter}>
              contact@blocktrust.tech
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
