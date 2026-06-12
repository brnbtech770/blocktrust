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

/** Enterprise + dashboard user — pas d’accès /admin/* */
export const INTERNAL_EMAILS = [
  'brnbimmo@gmail.com',
  'contact@brnb.fr',
  'bernabeshai56@gmail.com',
  'johannabernabe3@gmail.com',
  'johannafartoukh@yahoo.fr',
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

export function getAllInternalEmails(): readonly string[] {
  return [...DASHBOARD_ADMIN_EMAILS, ...INTERNAL_EMAILS]
}

/**
 * Emails admin pour notifications (Trust Circle, etc.).
 * ADMIN_EMAILS (Vercel) prime si défini ; sinon DASHBOARD_ADMIN_EMAILS.
 */
export function getAdminEmailList(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (fromEnv.length > 0) return fromEnv
  return [...DASHBOARD_ADMIN_EMAILS]
}

export function isDashboardAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const e = normalizeEmail(email)
  return (DASHBOARD_ADMIN_EMAILS as readonly string[]).includes(e)
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return normalizeEmail(email) === SUPER_ADMIN_EMAIL
}

/**
 * Comptes internes BLOCKTRUST (9 emails) — libellé « Compte interne » + Enterprise via resolveEffectivePlan.
 */
export function isInternalAccount(email: string | null | undefined): boolean {
  if (!email) return false
  const e = normalizeEmail(email)
  return getAllInternalEmails().includes(e)
}

/** Alias historique — accès dashboard admin uniquement (pas les comptes internes secondaires). */
export function isAdmin(email: string | null | undefined): boolean {
  return isDashboardAdmin(email)
}
