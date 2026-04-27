// emails/CertificateAnchoredEmail.tsx
// Template : certificat ancré sur Polygon — design dark navy/cyan/gold
// ============================================================

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export const subject = '⛓️ Votre certificat BLOCKTRUST est ancré sur Polygon'

export type CertificateAnchoredEmailProps = {
  userName: string
  entityName: string
  certificateId: string
  polygonTxHash: string
  polygonBlock: number
  polygonExplorerUrl: string
  anchoredAt: Date
}

export function CertificateAnchoredEmail({
  userName,
  entityName,
  certificateId,
  polygonTxHash,
  polygonBlock,
  polygonExplorerUrl,
  anchoredAt,
}: CertificateAnchoredEmailProps) {
  const verifyUrl = `https://blocktrust.tech/verify/${certificateId}`
  const dateLabel = anchoredAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const blockLabel = `#${polygonBlock.toLocaleString('fr-FR')}`
  const txShort = `${polygonTxHash.slice(0, 10)}...${polygonTxHash.slice(-8)}`

  return (
    <Html>
      <Head />
      <Preview>
        Votre certificat {entityName} est ancré sur Polygon Mainnet — bloc {blockLabel}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Heading style={brand}>BLOCKTRUST</Heading>
            <Text style={tagline}>Certification d&apos;identité numérique</Text>
          </Section>

          {/* Hero block — ancrage confirmé */}
          <Section style={heroBox}>
            <Text style={heroIcon}>⛓️</Text>
            <Heading style={heroTitle}>
              Votre certificat est ancré sur Polygon !
            </Heading>
            <Text style={heroText}>
              Bonjour {userName}, votre identité numérique est désormais inscrite
              de façon immuable sur la blockchain Polygon Mainnet.
            </Text>
          </Section>

          {/* Détails */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>DÉTAILS DE L&apos;ANCRAGE</Text>

            <table style={tableStyle} role="presentation" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={tdLabel}>Entité certifiée</td>
                  <td style={tdValueBold}>{entityName}</td>
                </tr>
                <tr>
                  <td style={tdLabel}>Réseau blockchain</td>
                  <td style={tdValueGold}>Polygon Mainnet</td>
                </tr>
                <tr>
                  <td style={tdLabel}>Numéro de bloc</td>
                  <td style={tdValue}>{blockLabel}</td>
                </tr>
                <tr>
                  <td style={tdLabel}>Date d&apos;ancrage</td>
                  <td style={tdValue}>{dateLabel}</td>
                </tr>
                <tr>
                  <td style={tdLabel}>Hash transaction</td>
                  <td style={tdValueMono}>{txShort}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* CTAs */}
          <Section style={ctaSection}>
            <Button href={polygonExplorerUrl} style={btnSecondary}>
              Voir sur PolygonScan →
            </Button>
            <Text style={ctaSpacer}>&nbsp;</Text>
            <Button href={verifyUrl} style={btnPrimary}>
              Voir mon certificat
            </Button>
          </Section>

          {/* Pourquoi c'est important */}
          <Section style={infoBox}>
            <Text style={infoTitle}>Pourquoi c&apos;est important ?</Text>
            <Text style={infoText}>
              L&apos;ancrage sur Polygon Mainnet rend votre certificat
              <strong> immuable</strong>, <strong>vérifiable publiquement</strong> et
              <strong> infalsifiable</strong>. Toute personne peut désormais prouver
              l&apos;authenticité de votre identité via PolygonScan.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerBrand}>BLOCKTRUST — BRNB TECH SASU</Text>
            <Text style={footerText}>
              Ancré de façon immuable sur Polygon Mainnet · blocktrust.tech
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default CertificateAnchoredEmail

// ============================================================
// STYLES
// ============================================================

const main = {
  backgroundColor: '#0a1628',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
}

const headerSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const brand = {
  color: '#00d4ff',
  fontSize: '28px',
  fontWeight: 800,
  letterSpacing: '4px',
  margin: 0,
}

const tagline = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '12px',
  margin: '6px 0 0',
  letterSpacing: '1px',
}

const heroBox = {
  background: 'linear-gradient(135deg, #0d1f3c 0%, #060d1a 100%)',
  border: '1px solid #BDA76B',
  borderRadius: '12px',
  padding: '32px 28px',
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const heroIcon = {
  fontSize: '48px',
  margin: '0 0 12px',
  lineHeight: 1,
}

const heroTitle = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 12px',
  lineHeight: 1.3,
}

const heroText = {
  color: 'rgba(255,255,255,0.75)',
  fontSize: '15px',
  lineHeight: 1.5,
  margin: 0,
}

const detailsBox = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '24px',
  marginBottom: '24px',
}

const detailsTitle = {
  color: '#00d4ff',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '2px',
  margin: '0 0 16px',
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const tdLabel = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '13px',
  padding: '8px 0',
  verticalAlign: 'top' as const,
}

const tdValue = {
  color: '#ffffff',
  fontSize: '13px',
  padding: '8px 0',
  textAlign: 'right' as const,
}

const tdValueBold = {
  ...tdValue,
  fontWeight: 700,
}

const tdValueGold = {
  ...tdValue,
  color: '#BDA76B',
  fontWeight: 600,
}

const tdValueMono = {
  ...tdValue,
  color: '#00d4ff',
  fontSize: '11px',
  fontFamily: '"SFMono-Regular", Menlo, Monaco, Consolas, monospace',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '8px 0 24px',
}

const btnPrimary = {
  background: '#00d4ff',
  color: '#0a1628',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
  display: 'inline-block',
}

const btnSecondary = {
  background: 'transparent',
  border: '2px solid #00d4ff',
  color: '#00d4ff',
  padding: '10px 26px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
  display: 'inline-block',
}

const ctaSpacer = {
  display: 'inline-block',
  width: '12px',
  margin: 0,
}

const infoBox = {
  background: 'rgba(189,167,107,0.08)',
  borderLeft: '3px solid #BDA76B',
  borderRadius: '0 6px 6px 0',
  padding: '16px 20px',
  marginBottom: '8px',
}

const infoTitle = {
  color: '#E8D08A',
  fontSize: '13px',
  fontWeight: 700,
  margin: '0 0 6px',
}

const infoText = {
  color: 'rgba(255,255,255,0.7)',
  fontSize: '13px',
  lineHeight: 1.55,
  margin: 0,
}

const hr = {
  borderColor: 'rgba(255,255,255,0.08)',
  margin: '28px 0 16px',
}

const footerSection = {
  textAlign: 'center' as const,
}

const footerBrand = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: '12px',
  margin: 0,
  letterSpacing: '1px',
}

const footerText = {
  color: 'rgba(255,255,255,0.3)',
  fontSize: '11px',
  margin: '4px 0 0',
}
