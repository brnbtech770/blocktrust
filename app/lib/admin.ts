// app/lib/admin.ts
// Gestion des administrateurs
// ============================================================

export const ADMIN_EMAILS = [
  'brnbtech@gmail.com',
  'laurianne@blocktrust.tech', // À ajouter quand elle aura son compte
]

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
