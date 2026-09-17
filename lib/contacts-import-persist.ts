// Persistance import contacts (CSV / Google) — Entity purpose=contact, sans Trust Circle.
// ============================================================

import { prisma } from "@/app/lib/db";
import { checkEntityQuota } from "@/lib/checkQuota";
import { isUserOwnProfileEntity } from "@/lib/entity-contacts";
import { assertSafeDisplayText } from "@/lib/sanitize-display-text";
import { normalizeEmail } from "@/lib/email-normalize";
import type { ParsedContactRow } from "@/lib/contacts-import";

export type ContactsImportPersistResult = {
  imported: number;
  duplicates: number;
  skippedOwn: number;
  invalid: number;
  quotaSkipped: number;
  importedEmails: string[];
};

export async function persistImportedContacts(input: {
  userId: string;
  userEmail: string | null;
  rows: ParsedContactRow[];
}): Promise<ContactsImportPersistResult> {
  const existing = await prisma.entity.findMany({
    where: { userId: input.userId },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((e) => normalizeEmail(e.email)));

  let duplicates = 0;
  let skippedOwn = 0;
  let invalid = 0;

  const toCreate: Array<{
    userId: string;
    entityType: "INDIVIDUAL";
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    description: string | null;
  }> = [];

  for (const row of input.rows) {
    const emailNorm = normalizeEmail(row.email);
    if (isUserOwnProfileEntity({ email: emailNorm }, input.userEmail)) {
      skippedOwn += 1;
      continue;
    }
    if (existingEmails.has(emailNorm)) {
      duplicates += 1;
      continue;
    }

    const fn = assertSafeDisplayText(row.firstName, "Prénom");
    const ln = assertSafeDisplayText(row.lastName, "Nom");
    if (!fn.ok || !ln.ok) {
      invalid += 1;
      continue;
    }

    let description: string | null = null;
    if (row.company) {
      const companyCheck = assertSafeDisplayText(row.company, "Entreprise");
      description = companyCheck.ok ? companyCheck.value.slice(0, 1000) : null;
    }

    toCreate.push({
      userId: input.userId,
      entityType: "INDIVIDUAL",
      firstName: fn.value,
      lastName: ln.value,
      email: emailNorm,
      phone: row.phone ? row.phone.slice(0, 40) : null,
      description,
    });
    existingEmails.add(emailNorm);
  }

  const quota = await checkEntityQuota(input.userId);
  const remaining =
    quota.max == null ? toCreate.length : Math.max(0, quota.max - (quota.current ?? 0));
  const accepted = toCreate.slice(0, remaining);
  const quotaSkipped = toCreate.length - accepted.length;

  if (accepted.length > 0) {
    await prisma.entity.createMany({ data: accepted });
  }

  return {
    imported: accepted.length,
    duplicates,
    skippedOwn,
    invalid,
    quotaSkipped,
    importedEmails: accepted.map((row) => row.email),
  };
}
