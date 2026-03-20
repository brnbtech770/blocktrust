// emails/MagicLinkEmail.tsx
// Lien de connexion sans mot de passe (magic link)
// ============================================================

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export const subject = 'Votre lien de connexion BlockTrust'

type MagicLinkEmailProps = {
  url: string
}

export function MagicLinkEmail({ url }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Connectez-vous à BlockTrust en un clic</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Connexion BlockTrust</Heading>
          <Text style={text}>Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien expire sous 24 h.</Text>
          <Section style={buttonContainer}>
            <Link href={url} style={button}>
              Se connecter
            </Link>
          </Section>
          <Text style={muted}>Si vous n&apos;avez pas demandé cet email, ignorez-le.</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: 'Inter, sans-serif' }
const container = { margin: '0 auto', padding: '24px', maxWidth: '560px' }
const h1 = { color: '#0a1628', fontSize: '22px', fontWeight: '700', margin: '0 0 16px' }
const text = { color: '#334155', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const muted = { color: '#64748b', fontSize: '13px', lineHeight: '20px', margin: '24px 0 0' }
const buttonContainer = { margin: '24px 0' }
const button = {
  backgroundColor: '#00d4ff',
  color: '#0a1628',
  fontWeight: '700',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}
