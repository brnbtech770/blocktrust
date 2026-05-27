// emails/KYCRejectedEmail.tsx
// Template : vérification refusée — action requise
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

export const subject = 'Vérification refusée — Action requise'

export type KYCRejectedEmailProps = {
  userName: string
  reason?: string
}

export function KYCRejectedEmail({ userName, reason }: KYCRejectedEmailProps) {
  const supportUrl = 'mailto:support@blocktrust.tech'
  return (
    <Html>
      <Head />
      <Preview>Vérification d&apos;identité refusée. Contacter le support.</Preview>
      <Body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Section style={headerSection}>
            <Text style={logoTitle}>BLOCKTRUST</Text>
            <Text style={logoSub}>BRNB TECH SAS</Text>
          </Section>
          <Section style={bodySection}>
            <Text style={titleStyle}>Vérification refusée</Text>
            <Text style={textStyle}>Bonjour {userName},</Text>
            <Text style={textStyle}>
              {reason ?? "Votre vérification d'identité n'a pas pu être validée. Veuillez contacter le support pour plus de détails."}
            </Text>
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link href={supportUrl} style={buttonCyan}>
                Contacter le support
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
