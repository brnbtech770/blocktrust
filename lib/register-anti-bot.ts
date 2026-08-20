// lib/register-anti-bot.ts
// Heuristiques inscription (noms / emails suspects).
// ============================================================

const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwam.com',
  'yopmail.com',
])

/** Pattern local-part type p.u.j.o.s + chiffres (bots observés). */
const BOT_LOCAL_PART_REGEX = /^[a-z](?:\.[a-z]){4}\d+$/i

export function matchesBotEmailPattern(email: string): boolean {
  const local = email.split('@')[0] ?? ''
  return BOT_LOCAL_PART_REGEX.test(local)
}

export function isDisposableEmailDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim() ?? ''
  return DISPOSABLE_DOMAINS.has(domain)
}

export function longestTokenLength(name: string | null | undefined): number {
  if (!name?.trim()) return 0
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.reduce((m, p) => Math.max(m, p.length), 0)
}

/** Sans abonnement + segment de nom > 15 caractères sans espace. */
export function isSuspectUserForAdmin(name: string | null | undefined, hasActivePlan: boolean): boolean {
  if (hasActivePlan) return false
  return longestTokenLength(name) > 15
}
