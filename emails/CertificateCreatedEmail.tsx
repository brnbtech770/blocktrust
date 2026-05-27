// emails/CertificateCreatedEmail.tsx
// Template : certificat généré — design sobre, bleu #1e40af, fond blanc
// ============================================================

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { EmailSignatureBadge } from './components/EmailSignatureBadge'
import { CertifiedEmailFooter } from './components/CertifiedEmailFooter'

export const subject = 'Votre certificat BlockTrust est généré ✅'

type CertificateCreatedEmailProps = {
  entityName: string
  verifyUrl: string
  qrCodeDataUrl?: string
  embedSnippet?: string
  ownerCertId?: string | null
  ownerVerifyUrl?: string | null
  ownerDisplayName?: string | null
}

export function CertificateCreatedEmail({
  entityName,
  verifyUrl,
  qrCodeDataUrl,
  embedSnippet,
  ownerCertId,
  ownerVerifyUrl,
  ownerDisplayName,
}: CertificateCreatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Certificat {entityName} — lien de vérification et QR code</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Votre certificat BlockTrust est généré ✅</Heading>
          <Text style={text}>
            Le certificat pour <strong>{entityName}</strong> a été créé avec succès.
          </Text>

          <Section style={box}>
            <Text style={label}>Lien de vérification public</Text>
            <Link href={verifyUrl} style={link}>
              {verifyUrl}
            </Link>
          </Section>

          {qrCodeDataUrl ? (
            <Section style={qrSection}>
              <Text style={label}>QR code</Text>
              <Img src={qrCodeDataUrl} alt="QR code de vérification" width={200} height={200} style={qrImg} />
            </Section>
          ) : null}

          {embedSnippet ? (
            <Section style={box}>
              <Text style={label}>Code HTML à intégrer (badge)</Text>
              <pre style={code}>{embedSnippet}</pre>
            </Section>
          ) : (
            <Section style={box}>
              <Text style={label}>Exemple d’intégration</Text>
              <pre style={code}>{`<a href="${verifyUrl}" target="_blank" rel="noopener">Vérifier ce certificat BlockTrust</a>`}</pre>
            </Section>
          )}

          <Section style={note}>
            <Text style={noteTitle}>Note de sécurité</Text>
            <Text style={noteText}>
              Ne partagez ce lien qu’avec des destinataires de confiance. Toute vérification sera enregistrée.
              En cas d’utilisation frauduleuse, vous pouvez révoquer le certificat depuis votre tableau de bord.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section
            style={{
              backgroundColor: '#0a1628',
              borderRadius: '8px',
              padding: '16px 20px 8px',
              marginTop: '8px',
            }}
          >
            <EmailSignatureBadge
              senderName={ownerDisplayName?.trim() || 'BLOCKTRUST'}
              certId={ownerCertId ?? null}
              verifyUrl={ownerVerifyUrl ?? null}
            />
          </Section>

          <CertifiedEmailFooter certId={ownerCertId} />

          <Text style={footer}>BlockTrust — Certification numérique fiable</Text>
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
const box = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '16px',
  margin: '16px 0',
  borderLeft: '4px solid #1e40af',
}
const label = {
  color: '#6b7280',
  fontSize: '11px',
  fontWeight: '600',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const link = {
  color: '#1e40af',
  fontSize: '14px',
  wordBreak: 'break-all' as const,
}
const code = {
  backgroundColor: '#1e293b',
  color: '#e2e8f0',
  padding: '12px',
  borderRadius: '4px',
  fontSize: '12px',
  overflow: 'auto' as const,
  margin: 0,
}
const qrSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
}
const qrImg = {
  display: 'block',
  margin: '0 auto',
}
const note = {
  backgroundColor: '#fef9c3',
  borderLeft: '4px solid #ca8a04',
  padding: '12px 16px',
  borderRadius: '0 6px 6px 0',
  margin: '20px 0',
}
const noteTitle = {
  color: '#854d0e',
  fontWeight: '600',
  margin: '0 0 6px',
  fontSize: '14px',
}
const noteText = {
  color: '#713f12',
  fontSize: '13px',
  lineHeight: '20px',
  margin: 0,
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { color: '#6b7280', fontSize: '12px' }
