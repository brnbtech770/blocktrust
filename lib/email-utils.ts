// lib/email-utils.ts
// Normalisation email (Gmail dot trick, plus addressing) + recherche unicité.
// ============================================================

import { prisma } from "@/app/lib/db";

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

type ExistingUserRow = { id: string; email: string | null };

/**
 * Cherche un User existant par email normalisé (compat comptes Gmail avec points en DB).
 */
export async function findUserByNormalizedEmail(
  email: string,
): Promise<ExistingUserRow | null> {
  const norm = normalizeEmail(email);
  const localNorm = norm.split("@")[0];
  const domain = norm.split("@")[1];

  const direct = await prisma.user.findFirst({
    where: {
      OR: [{ email: norm }, { email: { equals: norm, mode: "insensitive" } }],
    },
    select: { id: true, email: true },
  });
  if (direct) return direct;

  if (domain !== "gmail.com") return null;

  const rows = await prisma.$queryRaw<ExistingUserRow[]>`
    SELECT id, email
    FROM "User"
    WHERE email IS NOT NULL
      AND (
        LOWER(TRIM(email)) = ${norm}
        OR (
          LOWER(SPLIT_PART(email, '@', 2)) IN ('gmail.com', 'googlemail.com')
          AND REGEXP_REPLACE(SPLIT_PART(SPLIT_PART(LOWER(email), '@', 1), '+', 1), '\\.', '', 'g')
              = ${localNorm}
        )
      )
    LIMIT 1
  `;

  return rows[0] ?? null;
}
