// lib/email-utils.ts
// Recherche unicité email (Prisma). La normalisation pure est dans email-normalize.ts.
// ============================================================

import "server-only";
import { prisma } from "@/app/lib/db";
import { normalizeEmail } from "@/lib/email-normalize";

export { emailsCanonicallyEqual, normalizeEmail } from "@/lib/email-normalize";

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
