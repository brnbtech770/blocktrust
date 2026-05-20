// emails/PasswordResetEmail.tsx
// Réinitialisation du mot de passe — charte BLOCKTRUST™
// ============================================================

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export const subject = 'Réinitialisation de votre mot de passe BLOCKTRUST™'

export type PasswordResetEmailProps = {
  resetUrl: string
  userName?: string
}

export function PasswordResetEmail({ resetUrl, userName }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>BLOCKTRUST™</Text>
            <Text style={brandSub}>Certification d&apos;identité numérique</Text>
          </Section>

          <Hr style={hr} />

          <Section style={content}>
            <Text style={title}>Réinitialisation de votre mot de passe</Text>

            {userName ? <Text style={greeting}>Bonjour {userName},</Text> : null}

            <Text style={text}>
              Vous avez demandé la réinitialisation de votre mot de passe BLOCKTRUST™. Cliquez sur le
              bouton ci-dessous pour choisir un nouveau mot de passe.
            </Text>

            <Button href={resetUrl} style={button}>
              Réinitialiser mon mot de passe
            </Button>

            <Text style={expiry}>Ce lien expire dans 1 heure.</Text>

            <Hr style={hr} />

            <Text style={security}>
              Si vous n&apos;avez pas demandé cette réinitialisation, ignorez cet email. Votre compte
              reste sécurisé.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              BLOCKTRUST™ — Solution française de certification d&apos;identité numérique
            </Text>
            <Text style={footerLinks}>
              <Link href="https://blocktrust.tech" style={link}>
                blocktrust.tech
              </Link>
              {' · '}
              <Link href="https://blocktrust.tech/privacy" style={link}>
                Confidentialité
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#0a1628',
  fontFamily: 'Inter, Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '580px',
}

const header = {
  padding: '32px 40px 24px',
  textAlign: 'center' as const,
}

const brand = {
  color: '#00d4ff',
  fontSize: '20px',
  fontWeight: '700',
  letterSpacing: '0.1em',
  margin: '0',
}

const brandSub = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: '11px',
  margin: '4px 0 0 0',
}

const hr = {
  borderColor: 'rgba(0,212,255,0.2)',
  margin: '0 40px',
}

const content = {
  padding: '32px 40px',
}

const title = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px 0',
}

const greeting = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '15px',
  margin: '0 0 12px 0',
}

const text = {
  color: 'rgba(255,255,255,0.6)',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 24px 0',
}

const button = {
  backgroundColor: '#00d4ff',
  borderRadius: '8px',
  color: '#0a1628',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '24px',
}

const expiry = {
  color: 'rgba(255,255,255,0.3)',
  fontSize: '12px',
  margin: '0 0 24px 0',
}

const security = {
  color: 'rgba(255,255,255,0.3)',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
}

const footer = {
  padding: '24px 40px 32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: 'rgba(255,255,255,0.2)',
  fontSize: '11px',
  margin: '0 0 8px 0',
}

const footerLinks = {
  color: 'rgba(255,255,255,0.2)',
  fontSize: '11px',
  margin: '0',
}

const link = {
  color: 'rgba(255,255,255,0.3)',
  textDecoration: 'none',
}
