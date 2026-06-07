// emails/FraudAlertEmail.tsx
// Alerte titulaire — tentative d’usurpation / utilisation frauduleuse du badge
// ============================================================

import {
  Body,
  Button,
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

export const subject = 'Tentative de fraude détectée — BLOCKTRUST™'

export type FraudAlertEmailProps = {
  entityName: string
  /** Libellé lisible humain (ex. « Contexte incorrect », « QR dynamique »). */
  alertType: string
  /** Date/heure déjà formatée (ex. fr-FR). */
  occurredAt: string
  detail?: string | null
  dashboardUrl: string
  reportEmail?: string
}

export function FraudAlertEmail({
  entityName,
  alertType,
  occurredAt,
  detail,
  dashboardUrl,
  reportEmail = 'security@blocktrust.tech',
}: FraudAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Alerte sécurité : une tentative de fraude concerne votre certificat BLOCKTRUST™</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Une tentative de fraude a été détectée</Heading>
          <Text style={lead}>
            Une alerte a été enregistrée sur votre certificat pour le contact{' '}
            <strong style={{ color: '#111827' }}>{entityName}</strong>.
          </Text>

          <Section style={box}>
            <Text style={label}>Type d&apos;alerte</Text>
            <Text style={value}>{alertType}</Text>
            <Text style={label}>Date et heure</Text>
            <Text style={value}>{occurredAt}</Text>
            {detail ? (
              <>
                <Text style={label}>Détail</Text>
                <Text style={value}>{detail}</Text>
              </>
            ) : null}
          </Section>

          <Text style={text}>
            Quelqu&apos;un a pu tenter d&apos;utiliser un badge ou un lien de vérification à votre nom hors de son
            contexte légitime. Consultez votre tableau de bord pour l&apos;état de vos certificats.
          </Text>

          <Section style={btnRow}>
            <Button href={dashboardUrl} style={buttonPrimary}>
              Voir mon dashboard
            </Button>
          </Section>
          <Text style={textMuted}>
            Signaler un incident :{' '}
            <Link href={`mailto:${reportEmail}`} style={link}>
              {reportEmail}
            </Link>
          </Text>

          <Hr style={hr} />
          <Text style={footer}>BLOCKTRUST™ — Certification numérique</Text>
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
  color: '#b91c1c',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 16px',
}
const lead = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
}
const text = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px',
}
const textMuted = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '16px 0 0',
}
const link = { color: '#2563eb' }
const box = {
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #E05252',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
}
const label = {
  color: '#6b7280',
  fontSize: '11px',
  fontWeight: '600',
  margin: '12px 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const value = {
  color: '#1f2937',
  fontSize: '14px',
  fontFamily: 'monospace',
  margin: 0,
}
const btnRow = { textAlign: 'center' as const, margin: '24px 0 8px' }
const buttonPrimary = {
  backgroundColor: '#0a1628',
  color: '#00d4ff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '15px',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { color: '#6b7280', fontSize: '12px' }
