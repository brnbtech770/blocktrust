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
