// emails/FraudAlertEmail.tsx
// Template : alerte fraude — design sobre, bleu #1e40af, fond blanc
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

export const subject = '🚨 Alerte fraude détectée — votre badge utilisé hors contexte'

type FraudAlertEmailProps = {
  entityName: string
  tokenId: string
  timestamp: string
  ip?: string | null
  revokeUrl: string
}

export function FraudAlertEmail({
  entityName,
  tokenId,
  timestamp,
  ip,
  revokeUrl,
}: FraudAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Alerte : tentative d’utilisation frauduleuse du badge {entityName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🚨 Alerte fraude détectée</Heading>
          <Text style={alertText}>
            Une vérification a détecté une utilisation suspecte de votre badge BlockTrust (contexte
            modifié ou réutilisation hors cadre).
          </Text>

          <Section style={box}>
            <Text style={label}>Contact concerné</Text>
            <Text style={value}>{entityName}</Text>
            <Text style={label}>Token / JTI concerné</Text>
            <Text style={value}>{tokenId}</Text>
            <Text style={label}>Date / heure</Text>
            <Text style={value}>{timestamp}</Text>
            {ip ? (
              <>
                <Text style={label}>IP de la requête (attaquant)</Text>
                <Text style={value}>{ip}</Text>
              </>
            ) : null}
          </Section>

          <Text style={text}>
            Si vous n’êtes pas à l’origine de cette utilisation, nous vous recommandons de révoquer
            immédiatement le certificat ou la signature concernée pour éviter toute réutilisation
            abusive.
          </Text>
          <Section style={buttonContainer}>
            <Link href={revokeUrl} style={buttonDanger}>
              Révoquer immédiatement
            </Link>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            BlockTrust — Certification numérique fiable — Alerte sécurité
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
const alertText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
  fontWeight: '500',
}
const text = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px',
}
const box = {
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #b91c1c',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
}
const label = {
  color: '#6b7280',
  fontSize: '11px',
  fontWeight: '600',
  margin: '12px 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const value = {
  color: '#1f2937',
  fontSize: '14px',
  fontFamily: 'monospace',
  margin: 0,
}
const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}
const buttonDanger = {
  backgroundColor: '#b91c1c',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '15px',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { color: '#6b7280', fontSize: '12px' }
