// emails/components/EmailSignatureBadge.tsx
// Signature email — badge image hébergé + CTA vérifier (table layout, styles inline)
// ============================================================

import {
  Button,
  Column,
  Hr,
  Img,
  Link,
  Row,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { getBlocktrustBaseUrl } from '@/lib/public-verify-url'

export interface EmailSignatureBadgeProps {
  senderName: string
  certId?: string | null
  verifyUrl?: string | null
  inviteUrl?: string
}

export function EmailSignatureBadge({
  senderName,
  certId,
  verifyUrl,
  inviteUrl,
}: EmailSignatureBadgeProps) {
  const base = getBlocktrustBaseUrl()
  const inviteHref = inviteUrl ?? `${base}/pricing`
  const badgeImgUrl = certId ? `${base}/api/badge/${encodeURIComponent(certId)}?size=sm` : null

  return (
    <Section style={wrapper}>
      <Hr style={hr} />

      <Row>
        <Column style={leftCol}>
          {badgeImgUrl ? (
            <Img
              src={badgeImgUrl}
              width={120}
              height={150}
              alt={`Badge certifié BLOCKTRUST de ${senderName}`}
              style={badgeImg}
            />
          ) : (
            <table style={fallbackBadge} role="presentation" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={fallbackInner}>
                    <Text style={btLabel}>BLOCKTRUST™</Text>
                    <Text style={btSub}>Identité vérifiée</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </Column>

        <Column style={rightCol}>
          <Text style={senderNameStyle}>{senderName}</Text>

          <Text style={certifiedText}>Identité certifiée BLOCKTRUST™</Text>

          {verifyUrl ? (
            <Button href={verifyUrl} style={verifyBtn}>
              Vérifier mon identité
            </Button>
          ) : null}

          <Text style={inviteTextStyle}>
            Pas encore de badge ?{' '}
            <Link href={inviteHref} style={inviteLinkStyle}>
              Créer le mien gratuitement
            </Link>
          </Text>
        </Column>
      </Row>

      <Text style={legalText}>
        Cet email a été envoyé via BLOCKTRUST™ — solution française de certification d&apos;identité numérique.{' '}
        <Link href={`${base}/privacy`} style={legalLink}>
          Politique de confidentialité
        </Link>
      </Text>
    </Section>
  )
}

const wrapper = { padding: '0 0 20px 0' }

const hr = {
  borderColor: 'rgba(0,212,255,0.2)',
  margin: '24px 0 16px 0',
}

const leftCol = {
  width: '130px',
  verticalAlign: 'top' as const,
  paddingRight: '16px',
}

const rightCol = {
  verticalAlign: 'top' as const,
}

const badgeImg = {
  display: 'block',
  borderRadius: '12px',
}

const fallbackBadge = {
  background: 'rgba(0,212,255,0.08)',
  border: '1px solid rgba(0,212,255,0.2)',
  borderRadius: '8px',
  width: '120px',
}

const fallbackInner = {
  padding: '12px',
  textAlign: 'center' as const,
}

const btLabel = {
  color: '#00d4ff',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.1em',
  margin: '0',
  fontFamily: 'Inter, Arial, sans-serif',
}

const btSub = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '9px',
  margin: '4px 0 0 0',
  fontFamily: 'Inter, Arial, sans-serif',
}

const senderNameStyle = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px 0',
  fontFamily: 'Inter, Arial, sans-serif',
}

const certifiedText = {
  color: 'rgba(16,185,129,0.8)',
  fontSize: '11px',
  margin: '0 0 12px 0',
  fontFamily: 'Inter, Arial, sans-serif',
}

const verifyBtn = {
  backgroundColor: 'rgba(0,212,255,0.15)',
  border: '1px solid rgba(0,212,255,0.3)',
  borderRadius: '8px',
  color: '#00d4ff',
  fontSize: '12px',
  fontWeight: '600',
  padding: '8px 20px',
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '12px',
}

const inviteTextStyle = {
  color: 'rgba(255,255,255,0.3)',
  fontSize: '10px',
  margin: '0',
  fontFamily: 'Inter, Arial, sans-serif',
}

const inviteLinkStyle = {
  color: '#BDA76B',
  textDecoration: 'none',
}

const legalText = {
  color: 'rgba(255,255,255,0.2)',
  fontSize: '9px',
  margin: '16px 0 0 0',
  fontFamily: 'Inter, Arial, sans-serif',
}

const legalLink = {
  color: 'rgba(255,255,255,0.3)',
}
