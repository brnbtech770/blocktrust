// emails/OrgInviteEmail.tsx
// Invitation équipe organisation B2B
// ============================================================

import { Body, Container, Head, Html, Link, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'

export const subject = 'Invitation équipe — BLOCKTRUST™'

export type OrgInviteEmailProps = {
  orgName: string
  inviterName: string | null
  signInUrl: string
}

export function OrgInviteEmail({ orgName, inviterName, signInUrl }: OrgInviteEmailProps) {
  const who = inviterName?.trim() || 'Un administrateur'
  return (
    <Html>
      <Head />
      <Preview>Vous êtes invité à rejoindre {orgName} sur BLOCKTRUST™</Preview>
      <Body style={{ backgroundColor: '#0a1628', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ padding: '24px', maxWidth: '520px' }}>
          <Text style={{ color: '#00d4ff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em' }}>
            BLOCKTRUST™
          </Text>
          <Text style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '12px' }}>
            Invitation équipe
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>
            {who} vous invite à rejoindre l&apos;organisation <strong style={{ color: '#BDA76B' }}>{orgName}</strong>{' '}
            sur BLOCKTRUST™.
          </Text>
          <Section style={{ marginTop: '24px' }}>
            <Link
              href={signInUrl}
              style={{
                display: 'inline-block',
                padding: '12px 20px',
                backgroundColor: '#00d4ff',
                color: '#0a1628',
                fontWeight: 700,
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              Accepter — se connecter
            </Link>
          </Section>
          <Text style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '28px' }}>
            Si vous n&apos;avez pas encore de compte, créez-en un avec cette adresse e-mail puis ouvrez à nouveau
            l&apos;espace équipe depuis votre tableau de bord.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
