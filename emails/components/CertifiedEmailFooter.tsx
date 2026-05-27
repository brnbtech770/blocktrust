// emails/components/CertifiedEmailFooter.tsx
// Footer — identité certifiée BLOCKTRUST™ (emails sortants)
// ============================================================

import { Column, Hr, Link, Row, Section, Text } from '@react-email/components'
import * as React from 'react'
import { getBlocktrustBaseUrl } from '@/lib/public-verify-url'

export type CertifiedEmailFooterProps = {
  certId?: string | null
}

export function CertifiedEmailFooter({ certId }: CertifiedEmailFooterProps) {
  const base = getBlocktrustBaseUrl()
  const verifyHref = certId?.trim()
    ? `${base}/verify?certId=${encodeURIComponent(certId.trim())}`
    : null

  return (
    <Section style={wrapper}>
      <Hr style={hr} />
      <Row>
        <Column>
          <Text style={certifiedSignature}>
            ✓ Cet email est envoyé par une identité certifiée BLOCKTRUST™
          </Text>
          {verifyHref ? (
            <Link href={verifyHref} style={verifyLink}>
              Vérifier cette identité
            </Link>
          ) : (
            <Link href={base} style={verifyLink}>
              Découvrir BLOCKTRUST™
            </Link>
          )}
        </Column>
      </Row>
    </Section>
  )
}

const wrapper = {
  marginTop: '8px',
  paddingTop: '4px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0 16px',
}

const certifiedSignature = {
  color: '#10b981',
  fontSize: '12px',
  fontWeight: '600',
  lineHeight: '20px',
  margin: '0 0 8px',
  fontFamily: 'Inter, Arial, sans-serif',
}

const verifyLink = {
  color: '#1e40af',
  fontSize: '12px',
  fontWeight: '600',
  textDecoration: 'underline',
  fontFamily: 'Inter, Arial, sans-serif',
}
