// emails/KYCApprovedEmail.tsx
// Template : identité vérifiée — accès activé
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

export const subject = '✅ Identité vérifiée — Accès activé'

export type KYCApprovedEmailProps = {
  userName: string
}

export function KYCApprovedEmail({ userName }: KYCApprovedEmailProps) {
  const dashboardUrl = 'https://blocktrust.tech/dashboard'
  return (
    <Html>
      <Head />
      <Preview>Votre identité est vérifiée. Accédez à votre espace BlockTrust.</Preview>
      <Body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Section style={headerSection}>
            <Text style={logoTitle}>BLOCKTRUST</Text>
            <Text style={logoSub}>BRNB TECH SASU</Text>
          </Section>
          <Section style={bodySection}>
            <Text style={titleStyle}>Votre identité est vérifiée</Text>
            <Text style={textStyle}>
              Bonjour {userName}, votre dossier a été validé. Votre espace BlockTrust est maintenant
              accessible.
            </Text>
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link href={dashboardUrl} style={buttonCyan}>
                Accéder à mon espace
              </Link>
            </Section>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>© 2026 BRNB TECH SASU · blocktrust.tech</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
