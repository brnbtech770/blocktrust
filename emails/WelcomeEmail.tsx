// emails/WelcomeEmail.tsx
// Template : bienvenue nouvel utilisateur BlockTrust
// Design sobre, bleu #1e40af, fond blanc
// ============================================================

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export const subject = 'Bienvenue sur BlockTrust 🔐'

type WelcomeEmailProps = {
  userName?: string | null
  dashboardUrl: string
}

export function WelcomeEmail({ userName, dashboardUrl }: WelcomeEmailProps) {
  const displayName = userName || 'Utilisateur'
  return (
    <Html>
      <Head />
      <Preview>Bienvenue sur BlockTrust — certification numérique fiable</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Bienvenue sur BlockTrust 🔐</Heading>
          <Text style={text}>Bonjour {displayName},</Text>
          <Text style={text}>
            Votre compte BlockTrust est prêt. Vous pouvez dès maintenant créer des certificats
            numériques, les partager et les faire vérifier en toute confiance.
          </Text>
          <Section style={buttonContainer}>
            <Link href={dashboardUrl} style={button}>
              Accéder au tableau de bord
            </Link>
          </Section>
          <Text style={text}>
            <strong>Vous pouvez :</strong>
          </Text>
          <Text style={list}>• Créer des contacts (personnes ou entreprises)</Text>
          <Text style={list}>• Générer des certificats avec lien de vérification et QR code</Text>
          <Text style={list}>• Intégrer le badge sur vos sites ou emails</Text>
          <Text style={list}>• Consulter les statistiques de vérification</Text>
          <Hr style={hr} />
          <Text style={footer}>
            BlockTrust — Certification numérique fiable. Pour toute question :{' '}
            <Link href="mailto:support@blocktrust.tech" style={linkFooter}>support@blocktrust.tech</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
}
const h1 = {
  color: '#1e40af',
  fontSize: '22px',
  fontWeight: '600',
  margin: '0 0 20px',
}
const text = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px',
}
const list = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 6px',
  paddingLeft: '8px',
}
const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}
const button = {
  backgroundColor: '#1e40af',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '15px',
}
const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}
const footer = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '18px',
}
const linkFooter = {
  color: '#1e40af',
  textDecoration: 'none',
}
