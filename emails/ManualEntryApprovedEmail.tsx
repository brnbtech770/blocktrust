// emails/ManualEntryApprovedEmail.tsx
// Template : entrée manuelle validée par BlockTrust
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

export const subject = '✅ Entrée validée par BlockTrust'

export type ManualEntryApprovedEmailProps = {
  userName: string
  entityName: string
}

export function ManualEntryApprovedEmail({ userName, entityName }: ManualEntryApprovedEmailProps) {
  const dashboardUrl = 'https://blocktrust.tech/dashboard/trust-circle'
  return (
    <Html>
      <Head />
      <Preview>{entityName} a été validée par notre équipe.</Preview>
      <Body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Section style={headerSection}>
            <Text style={logoTitle}>BLOCKTRUST</Text>
            <Text style={logoSub}>BRNB TECH SASU</Text>
          </Section>
          <Section style={bodySection}>
            <Text style={titleStyle}>Entrée validée</Text>
            <Text style={textStyle}>Bonjour {userName},</Text>
            <Text style={textStyle}>
              {entityName} a été validée par notre équipe. Elle apparaît maintenant dans votre Trust
              Circle.
            </Text>
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link href={dashboardUrl} style={buttonCyan}>
                Voir mon Trust Circle
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
