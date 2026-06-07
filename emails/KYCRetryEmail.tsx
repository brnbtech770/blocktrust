// emails/KYCRetryEmail.tsx
// Template : vérification incomplète — réessayez
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

export const subject = 'Vérification incomplète — Réessayez'

export type KYCRetryEmailProps = {
  userName: string
  verificationUrl: string
}

export function KYCRetryEmail({ userName, verificationUrl }: KYCRetryEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Des informations sont manquantes. Reprenez la vérification.</Preview>
      <Body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Section style={headerSection}>
            <Text style={logoTitle}>BLOCKTRUST™</Text>
            <Text style={logoSub}>BRNB TECH SAS</Text>
          </Section>
          <Section style={bodySection}>
            <Text style={titleStyle}>Des informations sont manquantes</Text>
            <Text style={textStyle}>
              Bonjour {userName}, pour finaliser votre vérification d&apos;identité, merci de
              compléter les informations demandées.
            </Text>
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link href={verificationUrl} style={buttonCyan}>
                Reprendre la vérification
              </Link>
            </Section>
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
