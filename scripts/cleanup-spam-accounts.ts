/**
 * Suspend les comptes non vérifiés créés il y a plus de 7 jours (spam / bots).
 * Exclut : grandfathering (< 13/07/2026), internes/admins, emails E2E.
 *
 * Usage :
 *   npx tsx scripts/cleanup-spam-accounts.ts          # dry-run (défaut)
 *   npx tsx scripts/cleanup-spam-accounts.ts --apply  # suspendre en base
 */
import "dotenv/config";
import { prisma } from "@/app/lib/db";
import { getInternalEmailList } from "@/lib/admin-utils";
import {
  EMAIL_VERIFICATION_REQUIRED_SINCE,
} from "@/lib/email-verification";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const E2E_EMAIL_SUFFIX = "@blocktrust-e2e.test";

type Candidate = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: Date;
  accountStatus: string;
};

const protectedEmails = new Set(
  getInternalEmailList().map((e) => e.trim().toLowerCase()),
);

function isE2ETestEmail(email: string | null): boolean {
  return (email?.trim().toLowerCase().endsWith(E2E_EMAIL_SUFFIX) ?? false);
}

function isProtectedInternalEmail(email: string | null): boolean {
  if (!email?.trim()) return false;
  return protectedEmails.has(email.trim().toLowerCase());
}

function printAccount(u: Candidate): void {
  console.log(
    `- ${u.email ?? "(sans email)"} | ${u.name ?? "—"} | créé ${u.createdAt.toISOString()} | ${u.accountStatus}`,
  );
}

function partitionCandidates(candidates: Candidate[]): {
  grandfathered: Candidate[];
  internal: Candidate[];
  e2e: Candidate[];
  spam: Candidate[];
} {
  const grandfathered: Candidate[] = [];
  const internal: Candidate[] = [];
  const e2e: Candidate[] = [];
  const spam: Candidate[] = [];

  for (const u of candidates) {
    if (u.createdAt < EMAIL_VERIFICATION_REQUIRED_SINCE) {
      grandfathered.push(u);
      continue;
    }
    if (isProtectedInternalEmail(u.email)) {
      internal.push(u);
      continue;
    }
    if (isE2ETestEmail(u.email)) {
      e2e.push(u);
      continue;
    }
    spam.push(u);
  }

  return { grandfathered, internal, e2e, spam };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);

  const candidates = await prisma.user.findMany({
    where: {
      emailVerified: null,
      createdAt: { lt: cutoff },
      accountStatus: { not: "SUSPENDED" },
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      accountStatus: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const { grandfathered, internal, e2e, spam } = partitionCandidates(candidates);

  console.log(`\nMode : ${apply ? "APPLY (suspension)" : "DRY-RUN (aucune modification)"}`);
  console.log(
    `Seuil : emailVerified=null, créé avant ${cutoff.toISOString()}, non SUSPENDED`,
  );
  console.log(
    `Grandfathering : comptes créés avant ${EMAIL_VERIFICATION_REQUIRED_SINCE.toISOString()}\n`,
  );

  console.log(`=== Comptes grandfathered (exclus) — ${grandfathered.length} ===`);
  if (grandfathered.length === 0) {
    console.log("(aucun)");
  } else {
    for (const u of grandfathered) printAccount(u);
  }

  if (internal.length > 0) {
    console.log(`\n=== Comptes internes/admins (exclus) — ${internal.length} ===`);
    for (const u of internal) printAccount(u);
  }

  if (e2e.length > 0) {
    console.log(`\n=== Comptes test E2E (exclus) — ${e2e.length} ===`);
    for (const u of e2e) printAccount(u);
  }

  console.log(`\n=== Comptes spam à suspendre — ${spam.length} ===`);
  if (spam.length === 0) {
    console.log("(aucun)");
    await prisma.$disconnect();
    return;
  }

  for (const u of spam) printAccount(u);

  if (!apply) {
    console.log("\nRelancez avec --apply pour passer ces comptes en SUSPENDED.");
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.user.updateMany({
    where: { id: { in: spam.map((u) => u.id) } },
    data: { accountStatus: "SUSPENDED" },
  });

  console.log(`\n${result.count} compte(s) passé(s) en SUSPENDED.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
