// app/lib/admin.ts
// Gestion des administrateurs
// ============================================================

const adminEmailsRaw = process.env.ADMIN_EMAILS ?? "brnbtech@gmail.com";

export const ADMIN_EMAILS = adminEmailsRaw
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
