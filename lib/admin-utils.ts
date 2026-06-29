// lib/admin-utils.ts
// Rôles internes BLOCKTRUST — accès admin dashboard vs comptes Enterprise user-only
// ============================================================

/** Accès /admin/* et /api/admin/* */
export const DASHBOARD_ADMIN_EMAILS = [
  'brnbtech@gmail.com',
  'laurianne@winter-keys.com',
  'deborahbernabe@gmail.com',
  'shai270202@gmail.com',
] as const

/** Enterprise + dashboard user — pas d'accès /admin/* */
export const INTERNAL_EMAILS = [
  'brnbimmo@gmail.com',
  'contact@brnb.fr',
  'bernabeshai56@gmail.com',
  'johannabernabe3@gmail.com',
  'johannafartoukh@yahoo.fr',
  'olivierbernabe@gmail.com',
] as const

export const SUPER_ADMIN_EMAIL = 'brnbtech@gmail.com'

/** @deprecated Préférer INTERNAL_EMAILS — conservé pour imports existants */
export const JOHANNA_INTERNAL_EMAILS = [
  'johannabernabe3@gmail.com',
  'johannafartoukh@yahoo.fr',
] as const

export type DashboardAdminEmail = (typeof DASHBOARD_ADMIN_EMAILS)[number]
export type InternalEmail = (typeof INTERNAL_EMAILS)[number]

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function parseEmailListEnv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production'
}

let warnedAdminFallback = false
let warnedInternalFallback = false
let warnedSuperAdminFallback = false
let warnedLegacyAdminEnv = false

function warnOnce(flag: 'admin' | 'internal' | 'super' | 'legacyAdmin', message: string): void {
  if (flag === 'admin' && warnedAdminFallback) return
  if (flag === 'internal' && warnedInternalFallback) return
  if (flag === 'super' && warnedSuperAdminFallback) return
  if (flag === 'legacyAdmin' && warnedLegacyAdminEnv) return
  if (flag === 'admin') warnedAdminFallback = true
  if (flag === 'internal') warnedInternalFallback = true
  if (flag === 'super') warnedSuperAdminFallback = true
  if (flag === 'legacyAdmin') warnedLegacyAdminEnv = true
  console.warn(message)
}

export function getAllInternalEmails(): readonly string[] {
  return [...DASHBOARD_ADMIN_EMAILS, ...INTERNAL_EMAILS]
}

/**
 * Comptes internes Enterprise (INTERNAL_EMAILS) — sans les admins dashboard.
 */
function getInternalTeamEmailList(): string[] {
  const fromEnv = parseEmailListEnv('INTERNAL_EMAILS')
  const hardcoded = [...INTERNAL_EMAILS]

  if (isProductionEnv()) {
    if (fromEnv.length > 0) return fromEnv
    warnOnce(
      'internal',
      '[admin-utils] INTERNAL_EMAILS absent en production — fallback liste hardcodée',
    )
    return hardcoded
  }

  if (fromEnv.length === 0) return hardcoded
  return [...new Set([...fromEnv, ...hardcoded])]
}

/**
 * Emails autorisés sur /admin/* — DASHBOARD_ADMIN_EMAILS uniquement.
 * Prod : variable DASHBOARD_ADMIN_EMAILS (Vercel). ADMIN_EMAILS = fallback déprécié.
 * Garde-fou : un email INTERNAL_EMAILS seul n'est jamais promu admin (config env erronée).
 */
export function getAdminEmailList(): string[] {
  const fromDashboardEnv = parseEmailListEnv('DASHBOARD_ADMIN_EMAILS')
  const legacyEnv = parseEmailListEnv('ADMIN_EMAILS')
  const hardcodedAdmins = [...DASHBOARD_ADMIN_EMAILS]
  const internalTeam = new Set(getInternalTeamEmailList())

  let candidates: string[]
  if (isProductionEnv()) {
    if (fromDashboardEnv.length > 0) {
      candidates = fromDashboardEnv
    } else if (legacyEnv.length > 0) {
      warnOnce(
        'legacyAdmin',
        '[admin-utils] DASHBOARD_ADMIN_EMAILS absent — fallback ADMIN_EMAILS (déprécié)',
      )
      candidates = legacyEnv
    } else {
      warnOnce(
        'admin',
        '[admin-utils] DASHBOARD_ADMIN_EMAILS absent en production — fallback hardcodé',
      )
      candidates = hardcodedAdmins
    }
  } else {
    candidates = [...new Set([...fromDashboardEnv, ...legacyEnv, ...hardcodedAdmins])]
  }

  return candidates.filter(
    (email) =>
      hardcodedAdmins.includes(email as DashboardAdminEmail) || !internalTeam.has(email),
  )
}

/**
 * Tous les comptes internes (admins dashboard + équipe Enterprise) — plans, bootstrap, notifications.
 */
export function getInternalEmailList(): string[] {
  return [...new Set([...getInternalTeamEmailList(), ...getAdminEmailList()])]
}

/** Email super-admin (dashboard équipe interne). */
export function getSuperAdminEmail(): string {
  const fromEnv = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  const hardcoded = normalizeEmail(SUPER_ADMIN_EMAIL)

  if (isProductionEnv()) {
    if (fromEnv) return fromEnv
    warnOnce(
      'super',
      '[admin-utils] SUPER_ADMIN_EMAIL absent en production — fallback hardcodé',
    )
    return hardcoded
  }

  return fromEnv || hardcoded
}

export function isDashboardAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const e = normalizeEmail(email)
  return getAdminEmailList().includes(e)
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const e = normalizeEmail(email)
  if (e === getSuperAdminEmail()) return true
  if (!isProductionEnv() && e === normalizeEmail(SUPER_ADMIN_EMAIL)) return true
  return false
}

/**
 * Comptes internes BLOCKTRUST — libellé « Compte interne » + Enterprise via resolveEffectivePlan.
 */
export function isInternalAccount(email: string | null | undefined): boolean {
  if (!email) return false
  const e = normalizeEmail(email)
  return getInternalEmailList().includes(e)
}

/** Alias historique — accès dashboard admin uniquement (pas les comptes internes secondaires). */
export function isAdmin(email: string | null | undefined): boolean {
  return isDashboardAdmin(email)
}
