// emails/CertificateRevokedEmail.tsx
// Template : certificat révoqué — design sobre, bleu #1e40af, fond blanc
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

export const subject = '⚠️ Votre certificat a été révoqué'

type CertificateRevokedEmailProps = {
  entityName: string
  revokedAt: string
  revocationReason?: string | null
  dashboardUrl: string
}

export function CertificateRevokedEmail({
  entityName,
  revokedAt,
  revocationReason,
  dashboardUrl,
}: CertificateRevokedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Certificat {entityName} révoqué le {revokedAt}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⚠️ Votre certificat a été révoqué</Heading>
          <Text style={text}>
            Le certificat associé à <strong>{entityName}</strong> a été révoqué et n’est plus valide
            pour les vérifications.
          </Text>

          <Section style={box}>
            <Text style={label}>Date de révocation</Text>
            <Text style={value}>{revokedAt}</Text>
            {revocationReason ? (
              <>
                <Text style={label}>Raison</Text>
                <Text style={value}>{revocationReason}</Text>
              </>
            ) : null}
          </Section>

          <Text style={text}>
            Si vous souhaitez à nouveau prouver l’authenticité de ce contact, vous pouvez créer un
            nouveau certificat depuis votre tableau de bord.
          </Text>
          <Section style={buttonContainer}>
            <Link href={dashboardUrl} style={button}>
              Créer un nouveau certificat
            </Link>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>BLOCKTRUST™ — Certification numérique fiable</Text>
          <CertifiedEmailFooter />
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
