import { describe, expect, it } from 'vitest'
import { resolveWelcomeFirstName } from '@/lib/welcome-email'
import { welcomeEmailSubject } from '@/emails/WelcomeEmail'
import { CHROME_WEB_STORE_URL } from '@/emails/components/WelcomeUsageGuideSections'

describe('welcome-email', () => {
  it('resolveWelcomeFirstName uses first token of name', () => {
    expect(resolveWelcomeFirstName('Laurianne Martin', 'l@test.com')).toBe('Laurianne')
  })

  it('resolveWelcomeFirstName falls back to email local part', () => {
    expect(resolveWelcomeFirstName(null, 'olivier@blocktrust.tech')).toBe('olivier')
  })

  it('uses the expected welcome subject', () => {
    expect(welcomeEmailSubject).toBe('Bienvenue sur BLOCKTRUST™ — Votre guide de démarrage')
  })

  it('uses the official Chrome Web Store URL', () => {
    expect(CHROME_WEB_STORE_URL).toContain('chromewebstore.google.com')
    expect(CHROME_WEB_STORE_URL).toContain('bemcnlbifffejlijnndkdgcjpmijfaeg')
  })
})
