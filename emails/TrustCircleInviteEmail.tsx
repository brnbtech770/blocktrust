// emails/TrustCircleInviteEmail.tsx
// Template : invitation Trust Circle (utilisateur existant)
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
import { EmailSignatureBadge } from './components/EmailSignatureBadge'

export type TrustCircleInviteEmailProps = {
  inviterName: string
  inviterEmail: string
  confirmUrl: string
  senderCertId?: string | null
  senderVerifyUrl?: string | null
}

export function getTrustCircleInviteSubject(inviterName: string) {
  return `${inviterName} vous invite dans son Trust Circle`
}

export function TrustCircleInviteEmail({
  inviterName,
  inviterEmail,
  confirmUrl,
  senderCertId,
  senderVerifyUrl,
}: TrustCircleInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} vous a ajouté dans son cercle de confiance sur BlockTrust.</Preview>
      <Body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Section style={headerSection}>
            <Text style={logoTitle}>BLOCKTRUST</Text>
            <Text style={logoSub}>BRNB TECH SASU</Text>
          </Section>
          <Section style={bodySection}>
            <Text style={titleStyle}>Invitation Trust Circle</Text>
            <Text style={textStyle}>
              {inviterName} vous a ajouté dans son cercle de confiance sur BlockTrust.
            </Text>
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link href={confirmUrl} style={buttonCyan}>
                Confirmer la relation
              </Link>
            </Section>
            <Text style={{ ...textStyle, fontSize: '13px', color: '#6b7280' }}>
              Cette invitation expire dans 7 jours.
            </Text>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>© 2026 BRNB TECH SASU · blocktrust.tech</Text>
          </Section>

          <Section
            style={{
              backgroundColor: '#0a1628',
              borderRadius: '8px',
              marginTop: '16px',
              padding: '16px 20px 8px',
            }}
          >
            <EmailSignatureBadge
              senderName={inviterName}
              certId={senderCertId ?? null}
              verifyUrl={senderVerifyUrl ?? null}
            />
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
