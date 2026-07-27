// emails/WelcomeEmail.tsx
// Template : bienvenue nouvel utilisateur BLOCKTRUST™ + guide d'utilisation
// Charte BLOCKTRUST™ — navy #0a1628, cyan #00d4ff
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
  Text,
} from '@react-email/components'
import * as React from 'react'
import { CertifiedEmailFooter } from './components/CertifiedEmailFooter'
import {
  CHROME_WEB_STORE_URL,
  WelcomeUsageGuideSections,
} from './components/WelcomeUsageGuideSections'

export const welcomeEmailSubject = 'Bienvenue sur BLOCKTRUST™ — Votre guide de démarrage'

/** @deprecated Utiliser welcomeEmailSubject */
export const subject = welcomeEmailSubject

export type WelcomeEmailProps = {
  firstName: string
  dashboardUrl: string
  badgeVerifyUrl?: string | null
}

export function WelcomeEmail({
  firstName,
  dashboardUrl,
  badgeVerifyUrl,
}: WelcomeEmailProps) {
  const base = dashboardUrl.replace(/\/dashboard\/?$/, '')
  const extensionUrl = `${base}/dashboard/extension`
  const contactsUrl = `${base}/dashboard/entities`
  const bisUrl = `${base}/dashboard/bis`

  return (
    <Html>
      <Head />
      <Preview>
        Bienvenue sur BLOCKTRUST™ — extension Chrome, badge, contacts et signatures BIS en 5 minutes
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Bienvenue sur BLOCKTRUST™</Heading>
          <Text style={text}>Bonjour {firstName},</Text>
          <Text style={text}>
            Bienvenue sur BLOCKTRUST™ — votre identité numérique certifiée est active.
          </Text>

          <WelcomeUsageGuideSections
            dashboardUrl={dashboardUrl}
            chromeStoreUrl={CHROME_WEB_STORE_URL}
            extensionUrl={extensionUrl}
            contactsUrl={contactsUrl}
            bisUrl={bisUrl}
            badgeVerifyUrl={badgeVerifyUrl}
          />

          <Text style={text}>
            Des questions ? Contactez-nous :{' '}
            <Link href="mailto:contact@blocktrust.tech" style={link}>
              contact@blocktrust.tech
            </Link>
          </Text>

          <Text style={tagline}>
            La preuve que c&apos;est vous. La certitude que c&apos;est eux.
          </Text>
          <Text style={signature}>L&apos;équipe BLOCKTRUST™</Text>

          <Hr style={hr} />
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
  padding: '28px 20px',
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
const link = {
  color: '#0a1628',
  textDecoration: 'underline',
}
const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0 0',
}
const tagline = {
  color: '#0a1628',
  fontSize: '14px',
  fontWeight: '600',
  fontStyle: 'italic',
  margin: '20px 0 8px',
}
const signature = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0',
}
