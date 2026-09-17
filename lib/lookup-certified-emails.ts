// Emails qui ont un badge BLOCKTRUST actif (fait objectif, pas viewer-dependent).
// ============================================================

import { prisma } from "@/app/lib/db";
import { normalizeEmail } from "@/lib/email-normalize";

export async function lookupCertifiedEmails(emails: string[]): Promise<Set<string>> {
  const unique = [...new Set(emails.map((e) => normalizeEmail(e)).filter(Boolean))];
  if (unique.length === 0) return new Set();

  const out = new Set<string>();
  const chunkSize = 80;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const certs = await prisma.certificate.findMany({
      where: {
        status: { in: ["ACTIVE", "ANCHORED"] },
        entity: {
          OR: chunk.map((email) => ({
            email: { equals: email, mode: "insensitive" as const },
          })),
        },
      },
      select: { entity: { select: { email: true } } },
    });
    for (const row of certs) {
      out.add(normalizeEmail(row.entity.email));
    }
  }

  return out;

}
