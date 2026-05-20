// emails/MutualTrustEmail.tsx
// Template : confiance mutuelle activée
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

export type MutualTrustEmailProps = {
  userName: string
  partnerName: string
}

export function getMutualTrustSubject(partnerName: string) {
  return `🤝 Confiance mutuelle activée avec ${partnerName}`
}

export function MutualTrustEmail({ userName, partnerName }: MutualTrustEmailProps) {
  const dashboardUrl = 'https://blocktrust.tech/dashboard/trust-circle'
  return (
    <Html>
      <Head />
      <Preview>Vous et {partnerName} vous êtes ajoutés mutuellement. La confiance mutuelle est active.</Preview>
      <Body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Section style={headerSection}>
            <Text style={logoTitle}>BLOCKTRUST</Text>
            <Text style={logoSub}>BRNB TECH SAS</Text>
          </Section>
          <Section style={bodySection}>
            <Text style={titleStyle}>Confiance mutuelle activée</Text>
            <Text style={textStyle}>
              Vous et {partnerName} vous êtes ajoutés mutuellement. La confiance mutuelle est
              maintenant active.
            </Text>
            <Text style={textStyle}>
              Les alertes croisées sont activées : vous serez notifié si son certificat est révoqué
              ou compromis.
            </Text>
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link href={dashboardUrl} style={buttonCyan}>
                Voir mon Trust Circle
              </Link>
            </Section>
          </Section>
          <Section style={footerSection}>
            <Text style={footerText}>© 2026 BRNB TECH SAS · blocktrust.tech</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
