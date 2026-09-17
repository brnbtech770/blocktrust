// lib/email-normalize.ts
// Normalisation email (Gmail dot trick, plus addressing) — sans Prisma.
// Utilisable côté client. La recherche DB est dans lib/email-utils.ts.
// ============================================================

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Normalise un email pour comparaison d'unicité.
 * Gmail / Googlemail : retire les points et le plus addressing, domaine → gmail.com.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;

  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);

  if (GMAIL_DOMAINS.has(domain)) {
    domain = "gmail.com";
    local = local.split("+")[0].replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

export function emailsCanonicallyEqual(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b);
}
