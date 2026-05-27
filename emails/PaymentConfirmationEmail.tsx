// emails/PaymentConfirmationEmail.tsx
// Confirmation d’abonnement / paiement — charte sombre BlockTrust
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

export type PaymentConfirmationEmailProps = {
  userName: string
  planName: string
  amount: string
  billingPeriod: 'mensuel' | 'annuel'
  nextBillingDate: string
  invoiceUrl?: string
  dashboardUrl: string
}

export function PaymentConfirmationEmail({
  userName,
  planName,
  amount,
  billingPeriod,
  nextBillingDate,
  invoiceUrl,
  dashboardUrl,
}: PaymentConfirmationEmailProps) {
  const periodLabel = billingPeriod === 'annuel' ? 'annuel' : 'mensuel'

  return (
    <Html>
      <Head />
      <Preview>
        Merci pour votre abonnement {planName} — prochaine échéance : {nextBillingDate}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>BlockTrust</Text>
          <Heading style={h1}>Merci pour votre abonnement {planName} ✓</Heading>
          <Text style={text}>Bonjour {userName},</Text>
          <Text style={text}>
            Votre paiement a bien été enregistré. Votre formule <strong style={{ color: accent }}>{planName}</strong>{' '}
            est active.
          </Text>

          <Section style={box}>
            <Text style={label}>Montant</Text>
            <Text style={value}>{amount}</Text>
            <Text style={label}>Période de facturation</Text>
            <Text style={value}>{periodLabel}</Text>
            <Text style={label}>Prochaine échéance</Text>
            <Text style={value}>{nextBillingDate}</Text>
          </Section>

          <Section style={buttonContainer}>
            <Link href={dashboardUrl} style={button}>
              Accéder à mon dashboard
            </Link>
          </Section>

          {invoiceUrl ? (
            <Text style={text}>
              <Link href={invoiceUrl} style={link}>
                Télécharger / consulter votre facture Stripe
              </Link>
            </Text>
          ) : null}

          <Hr style={hr} />
          <Text style={footer}>
            <Link href="https://blocktrust.tech" style={footerLink}>
              blocktrust.tech
            </Link>
            {' · '}
            <Link href="mailto:support@blocktrust.tech" style={footerLink}>
              support@blocktrust.tech
            </Link>
          </Text>
          <CertifiedEmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

const bg = '#0a1628'
const accent = '#00d4ff'
const main = {
  backgroundColor: bg,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
  backgroundColor: 'rgba(13,31,60,0.85)',
  borderRadius: '12px',
  border: '1px solid rgba(0,212,255,0.2)',
}
const brand = {
  color: accent,
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  margin: '0 0 20px',
}
const h1 = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 600,
  margin: '0 0 16px',
  lineHeight: 1.3,
}
const text = {
  color: 'rgba(255,255,255,0.88)',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
}
const box = {
  backgroundColor: 'rgba(10,22,40,0.9)',
  borderRadius: '8px',
  padding: '18px 16px',
  margin: '20px 0',
  borderLeft: `4px solid ${accent}`,
}
const label = {
  color: 'rgba(0,212,255,0.75)',
  fontSize: '11px',
  fontWeight: 600,
  margin: '10px 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
}
const value = {
  color: '#ffffff',
  fontSize: '15px',
  margin: 0,
  fontWeight: 500,
}
const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0 20px',
}
const button = {
  backgroundColor: accent,
  color: '#0a1628',
  padding: '14px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: '15px',
}
const link = {
  color: accent,
  textDecoration: 'underline',
  fontSize: '14px',
}
const hr = {
  borderColor: 'rgba(0,212,255,0.2)',
  margin: '28px 0 16px',
}
const footer = {
  color: 'rgba(255,255,255,0.55)',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: 0,
}
const footerLink = {
  color: accent,
  textDecoration: 'none',
}
