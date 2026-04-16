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

function letterConsonantVowelCounts(s: string): { consonants: number; vowels: number } {
  const norm = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const vowels = new Set('aeiouy')
  let consonants = 0
  let vowelsCount = 0
  for (const ch of norm) {
    if (!/[a-z]/.test(ch)) continue
    if (vowels.has(ch)) vowelsCount++
    else consonants++
  }
  return { consonants, vowels: vowelsCount }
}

/**
 * Ratio consonnes/voyelles > 4 → rejet (noms très artificiels).
 */
export function consonantVowelRatioTooHigh(fullName: string): boolean {
  const { consonants, vowels } = letterConsonantVowelCounts(fullName)
  if (vowels === 0) return consonants > 4
  return consonants / vowels > 4
}

export type RegisterNameValidation = { ok: true } | { ok: false; code: 'format' | 'generated' }

/**
 * - Longueur totale prénom + espace + nom ≤ 60
 * - Au moins un espace dans le nom complet (prénom + nom) OU un seul mot < 20 car. (lettres uniquement)
 * - Aucun segment > 15 caractères sans espace
 * - Ratio consonnes/voyelles ≤ 4
 */
export function validateRegisterNames(firstName: string, lastName: string): RegisterNameValidation {
  const f = firstName.trim()
  const l = lastName.trim()
  const full = `${f} ${l}`.trim()

  if (full.length === 0) return { ok: false, code: 'format' }
  if (full.length > 60) return { ok: false, code: 'format' }

  const hasSpace = full.includes(' ')
  if (!hasSpace) {
    if (full.length >= 20 || !/^[a-zA-ZÀ-ÿ\-]+$/.test(full)) {
      return { ok: false, code: 'format' }
    }
  }

  const tokens = full.split(/\s+/).filter(Boolean)
  for (const t of tokens) {
    if (t.length > 15) return { ok: false, code: 'generated' }
  }

  if (consonantVowelRatioTooHigh(full)) {
    return { ok: false, code: 'generated' }
  }

  return { ok: true }
}
