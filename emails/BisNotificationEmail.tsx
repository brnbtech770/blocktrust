// emails/BisNotificationEmail.tsx
// Notification destinataire — signature BIS (tous types)
// ============================================================

import {
  Body,
  Button,
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
import { CertifiedEmailFooter } from './components/CertifiedEmailFooter'
import { getBisInteractionLabel } from '@/lib/bis-interaction-labels'
import {
  formatTruncatedContentHash,
  isDocumentLikeBisType,
} from '@/lib/bis-content-hash'

export type BisNotificationEmailProps = {
  senderDisplayName: string
  senderEmail: string
  interactionType: string
  contextLabel?: string | null
  contentHash?: string | null
  bisLevel: number
  signedAtLabel: string
  expiresAtLabel: string
  verifyUrl: string
  marketingUrl?: string
}

export function buildBisNotificationSubject(senderDisplayName: string): string {
  return `${senderDisplayName} a signé une interaction vérifiable`
}

export function BisNotificationEmail({
  senderDisplayName,
  senderEmail,
  interactionType,
  contextLabel,
  contentHash,
  bisLevel,
  signedAtLabel,
  expiresAtLabel,
  verifyUrl,
  marketingUrl = 'https://blocktrust.tech',
}: BisNotificationEmailProps) {
  const typeLabel = getBisInteractionLabel(interactionType)
  const isDocumentLike = isDocumentLikeBisType(interactionType)
  const truncatedHash =
    isDocumentLike && contentHash ? formatTruncatedContentHash(contentHash) : null
  const ctaLabel = isDocumentLike ? 'Vérifier ce document' : 'Vérifier cette signature'

  return (
    <Html>
      <Head />
      <Preview>
        {isDocumentLike && contextLabel
          ? `${senderDisplayName} a signé le document « ${contextLabel} » — BLOCKTRUST™`
          : `${senderDisplayName} a signé une interaction ${typeLabel} vérifiable BLOCKTRUST™`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isDocumentLike ? 'Document signé BLOCKTRUST™' : 'Interaction signée BLOCKTRUST™'}
          </Heading>
          <Text style={text}>
            <strong>{senderDisplayName}</strong> ({senderEmail}) — identité certifiée BLOCKTRUST™ —
            {isDocumentLike
              ? ' a signé un document vérifiable.'
              : ' a signé une interaction vérifiable.'}
          </Text>

          <Section style={infoBlock}>
            <Text style={infoRow}>
              <strong>Type :</strong> {typeLabel}
            </Text>
            {isDocumentLike && contextLabel ? (
              <Text style={infoRow}>
                <strong>Document :</strong> {contextLabel}
              </Text>
            ) : null}
            {!isDocumentLike && contextLabel ? (
              <Text style={infoRow}>
                <strong>Contexte :</strong> {contextLabel}
              </Text>
            ) : null}
            {truncatedHash ? (
              <Text style={infoRow}>
                <strong>Empreinte du document :</strong>{' '}
                <span style={mono}>{truncatedHash}</span>
              </Text>
            ) : null}
            <Text style={infoRow}>
              <strong>Niveau BIS :</strong> Niveau {bisLevel}
            </Text>
            <Text style={infoRow}>
              <strong>Signé le :</strong> {signedAtLabel}
            </Text>
            <Text style={infoRow}>
              <strong>Expire le :</strong> {expiresAtLabel} (7 jours)
            </Text>
          </Section>

          {isDocumentLike ? (
            <Section style={instructionsBlock}>
              <Text style={instructionsTitle}>
                Pour vérifier que le document que vous avez reçu n&apos;a pas été modifié :
              </Text>
              <Text style={instructionsStep}>1. Ouvrez le lien de vérification ci-dessous</Text>
              <Text style={instructionsStep}>
                2. Déposez le fichier reçu dans la zone prévue
              </Text>
              <Text style={instructionsStep}>
                3. BLOCKTRUST™ comparera l&apos;empreinte automatiquement
              </Text>
            </Section>
          ) : null}

          <Section style={buttonContainer}>
            <Button href={verifyUrl} style={button}>
              {ctaLabel}
            </Button>
          </Section>

          <Text style={note}>
            Cette signature cryptographique est infalsifiable et vérifiable par tous — même sans
            compte BLOCKTRUST.
          </Text>

          <Text style={muted}>
            Protégez vos propres interactions →{' '}
            <Link href={marketingUrl} style={link}>
              blocktrust.tech
            </Link>
          </Text>

          <Text style={muted}>
            Lien direct :{' '}
            <Link href={verifyUrl} style={link}>
              {verifyUrl}
            </Link>
          </Text>

          <Hr style={hr} />
          <Text style={signature}>BLOCKTRUST™ — Certifié · Protégé · Infalsifiable</Text>
          <CertifiedEmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f3f4f6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = {
  margin: '0 auto',
  padding: '32px 24px',
  maxWidth: '560px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
}
const h1 = {
  color: '#0a1628',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 20px',
}
const text = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 14px',
}
const infoBlock = {
  margin: '16px 0',
  padding: '14px 16px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  borderLeft: '3px solid #00d4ff',
}
const infoRow = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 8px',
}
const mono = {
  fontFamily: 'IBM Plex Mono, Menlo, Monaco, Consolas, monospace',
  fontSize: '13px',
}
const instructionsBlock = {
  margin: '16px 0',
  padding: '14px 16px',
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  borderLeft: '3px solid #10b981',
}
const instructionsTitle = {
  color: '#166534',
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '22px',
  margin: '0 0 10px',
}
const instructionsStep = {
  color: '#374151',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 6px',
}
const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}
const button = {
  backgroundColor: '#00d4ff',
  color: '#0a1628',
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: '700',
  fontSize: '15px',
}
const note = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 14px',
}
const muted = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 10px',
}
const link = {
  color: '#0a1628',
  textDecoration: 'underline',
}
const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}
const signature = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 8px',
}
