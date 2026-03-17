// emails/PaymentSuccessEmail.tsx
// Template : abonnement activé — design sobre, bleu #1e40af, fond blanc
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

export function getPaymentSuccessSubject(planName: string) {
  return `Abonnement ${planName} activé — merci !`
}

type PaymentSuccessEmailProps = {
  planName: string
  amountFormatted?: string
  currentPeriodEnd: string
  dashboardUrl: string
}

export function PaymentSuccessEmail({
  planName,
  amountFormatted,
  currentPeriodEnd,
  dashboardUrl,
}: PaymentSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Votre abonnement {planName} est actif. Prochain renouvellement : {currentPeriodEnd}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Merci pour votre confiance ✅</Heading>
          <Text style={text}>
            Votre abonnement <strong>{planName}</strong> est activé. Vous avez désormais accès à
            l’ensemble des fonctionnalités incluses dans ce plan.
          </Text>

          <Section style={box}>
            <Text style={label}>Plan souscrit</Text>
            <Text style={value}>{planName}</Text>
            {amountFormatted ? (
              <>
                <Text style={label}>Montant</Text>
                <Text style={value}>{amountFormatted}</Text>
              </>
            ) : null}
            <Text style={label}>Prochain renouvellement</Text>
            <Text style={value}>{currentPeriodEnd}</Text>
          </Section>

          <Section style={buttonContainer}>
            <Link href={dashboardUrl} style={button}>
              Accéder au tableau de bord
            </Link>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            BlockTrust — Certification numérique fiable. Gestion de l’abonnement : tableau de bord →
            Facturation.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
}
const h1 = {
  color: '#1e40af',
  fontSize: '22px',
  fontWeight: '600',
  margin: '0 0 20px',
}
const text = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
}
const box = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
  borderLeft: '4px solid #1e40af',
}
const label = {
  color: '#6b7280',
  fontSize: '11px',
  fontWeight: '600',
  margin: '8px 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const value = {
  color: '#1f2937',
  fontSize: '14px',
  margin: 0,
}
const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}
const button = {
  backgroundColor: '#1e40af',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '15px',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { color: '#6b7280', fontSize: '12px' }
