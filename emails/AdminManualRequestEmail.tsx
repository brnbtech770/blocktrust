// emails/AdminManualRequestEmail.tsx
// Template : nouvelle demande de vérification manuelle (envoyé aux admins)
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
  buttonGold,
  footerSection,
  footerText,
  headerSection,
  logoSub,
  logoTitle,
  textStyle,
  titleStyle,
} from './blocktrust-charte'
import { CertifiedEmailFooter } from './components/CertifiedEmailFooter'

export type AdminManualRequestEmailProps = {
  requestId: string
  requesterName: string
  entityName: string
  entityType: string
}

export function getAdminManualRequestSubject(requestId: string) {
  return `Nouvelle demande vérification #${requestId}`
}

export function AdminManualRequestEmail({
  requestId,
  requesterName,
  entityName,
  entityType,
}: AdminManualRequestEmailProps) {
  const adminUrl = 'https://blocktrust.tech/admin/demandes'
  return (
    <Html>
      <Head />
      <Preview>Nouvelle demande de vérification manuelle #{requestId}</Preview>
      <Body style={{ margin: 0, fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Section style={headerSection}>
            <Text style={logoTitle}>BLOCKTRUST</Text>
            <Text style={logoSub}>BRNB TECH SAS</Text>
          </Section>
          <Section style={bodySection}>
            <Text style={titleStyle}>Nouvelle demande de vérification</Text>
            <Text style={textStyle}>
              Une nouvelle demande de vérification manuelle a été soumise.
            </Text>
            <Section
              style={{
                margin: '16px 0',
                padding: 16,
                backgroundColor: '#f3f4f6',
                borderRadius: 8,
              }}
            >
              <Text style={{ ...textStyle, margin: '4px 0' }}>
                <strong>Demandeur :</strong> {requesterName}
              </Text>
              <Text style={{ ...textStyle, margin: '4px 0' }}>
                <strong>Entité :</strong> {entityName}
              </Text>
              <Text style={{ ...textStyle, margin: '4px 0' }}>
                <strong>Type :</strong> {entityType}
              </Text>
            </Section>
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Link href={adminUrl} style={buttonGold}>
                Traiter la demande
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
