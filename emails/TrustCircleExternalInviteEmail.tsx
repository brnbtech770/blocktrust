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
import { CertifiedEmailFooter } from './components/CertifiedEmailFooter'
import { JOIN_BLOCKTRUST_ESSENTIEL_LABEL } from '@/lib/pricing'

export type TrustCircleExternalInviteEmailProps = {
  inviterName: string
  recipientName: string
  inviteUrl: string
}

export function getTrustCircleExternalInviteSubject(inviterName: string) {
  return `${inviterName} vous fait confiance sur BLOCKTRUST™`
}

export function TrustCircleExternalInviteEmail({
  inviterName,
  recipientName: _recipientName,
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
            <Text style={logoTitle}>BLOCKTRUST™</Text>
            <Text style={logoSub}>BRNB TECH SAS</Text>
          </Section>
          <Section style={bodySection}>
            <Text style={titleStyle}>{inviterName} vous fait confiance</Text>
            <Text style={textStyle}>
              {inviterName} a certifié son identité numérique et vous invite à rejoindre son cercle
              de confiance.
            </Text>
            <Text style={textStyle}>Avec BLOCKTRUST™ vous bénéficiez de :</Text>
            {benefits.map((b, i) => (
              <Text key={i} style={{ ...textStyle, margin: '4px 0', paddingLeft: 8 }}>
                ✓ {b}
              </Text>
            ))}
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link href={inviteUrl} style={buttonCyan}>
                {JOIN_BLOCKTRUST_ESSENTIEL_LABEL}
              </Link>
            </Section>
            <Text style={{ ...textStyle, fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
              Sans engagement · CB obligatoire
            </Text>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>© 2026 BRNB TECH SAS · blocktrust.tech</Text>
          </Section>
          <CertifiedEmailFooter />
        </Container>
      </Body>
    </Html>
  )
}
