// emails/TrustCircleExternalInviteEmail.tsx
// Template : invitation Trust Circle (personne non inscrite)
// ============================================================

import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import {
  bodySection,
  buttonCyan,
  footerSection,
  footerText,
  headerSection,
  logoSub,
  logoTitle,
  textStyle,
  titleStyle,
} from './blocktrust-charte'

export type TrustCircleExternalInviteEmailProps = {
  inviterName: string
  recipientName: string
  inviteUrl: string
}

export function getTrustCircleExternalInviteSubject(inviterName: string) {
  return `${inviterName} vous fait confiance sur BlockTrust`
}

export function TrustCircleExternalInviteEmail({
  inviterName,
  recipientName,
  inviteUrl,
}: TrustCircleExternalInviteEmailProps) {
  const benefits = [
    'Identité certifiée et infalsifiable',
    'Badge QR vérifiable partout',
    'Protection contre l\'usurpation',
    'Alertes fraude en temps réel',
  ]
  return (
    <Html>
      <Head />
      <Preview>{inviterName} a certifié son identité numérique et vous invite à rejoindre son cercle de confiance.</Preview>
      <Body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Section style={headerSection}>
            <Text style={logoTitle}>BLOCKTRUST</Text>
            <Text style={logoSub}>BRNB TECH SASU</Text>
          </Section>
          <Section style={bodySection}>
            <Text style={titleStyle}>{inviterName} vous fait confiance</Text>
            <Text style={textStyle}>
              {inviterName} a certifié son identité numérique et vous invite à rejoindre son cercle
              de confiance.
            </Text>
            <Text style={textStyle}>Avec BlockTrust vous bénéficiez de :</Text>
            {benefits.map((b, i) => (
              <Text key={i} style={{ ...textStyle, margin: '4px 0', paddingLeft: 8 }}>
                ✓ {b}
              </Text>
            ))}
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link href={inviteUrl} style={buttonCyan}>
                Rejoindre BlockTrust — 4,99€/mois
              </Link>
            </Section>
            <Text style={{ ...textStyle, fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
              Sans engagement · CB obligatoire
            </Text>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>© 2026 BRNB TECH SASU · blocktrust.tech</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
