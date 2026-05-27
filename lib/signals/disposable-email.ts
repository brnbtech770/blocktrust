// lib/signals/disposable-email.ts
// Détection d'emails jetables (liste statique)
// ============================================================

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'guerrillamail.info',
  'spam4.me',
  'trashmail.at',
  'dispostable.com',
  'mailnull.com',
  'spamgourmet.com',
  'spamgourmet.net',
  'spamgourmet.org',
  'spamex.com',
  'spamfree24.org',
  'discard.email',
  'cfl.fr',
  'trashmail.me',
  'trashmail.net',
  'trashmail.io',
  'maildrop.cc',
  'getairmail.com',
  'filzmail.com',
  'throwam.com',
  'trbvm.com',
  'spamevader.com',
  '10minutemail.com',
  'tempinbox.com',
  'fakeinbox.com',
  'mailexpire.com',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return false
  return DISPOSABLE_DOMAINS.has(domain)
}

export function getEmailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? ''
}
