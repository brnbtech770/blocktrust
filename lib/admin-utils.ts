// lib/admin-utils.ts
// Liste admin depuis ADMIN_EMAILS (Vercel) — parse robuste multi-emails
// ============================================================

export function getAdminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmailList().includes(email.toLowerCase())
}

/**
 * Comptes internes BLOCKTRUST (équipe / VIP) : admins (ADMIN_EMAILS) + Johanna.
 * Usage purement COSMÉTIQUE (libellé « Compte interne »). N'affecte AUCUN droit :
 * les droits restent ceux résolus par resolveAccountPlan (Enterprise complet).
 */
const INTERNAL_EXTRA_EMAILS = [
  'johannabernabe3@gmail.com',
  'johannafartoukh@yahoo.fr',
] as const

export function isInternalAccount(email: string | null | undefined): boolean {
  if (!email) return false
  const e = email.toLowerCase()
  return isAdmin(email) || INTERNAL_EXTRA_EMAILS.includes(e as (typeof INTERNAL_EXTRA_EMAILS)[number])
}
