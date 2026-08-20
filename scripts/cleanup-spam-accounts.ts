/**
 * Suspend les comptes non vérifiés créés il y a plus de 7 jours (spam / bots).
 *
 * Usage :
 *   npx tsx scripts/cleanup-spam-accounts.ts          # dry-run (défaut)
 *   npx tsx scripts/cleanup-spam-accounts.ts --apply  # suspendre en base
 */
import "dotenv/config";
import { prisma } from "@/app/lib/db";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

  console.log(`\n=== Comptes non vérifiés > 7 jours (${candidates.length}) ===`);
  console.log(`Mode : ${apply ? "APPLY (suspension)" : "DRY-RUN (aucune modification)"}\n`);

  if (candidates.length === 0) {
    console.log("Aucun compte à traiter.");
    await prisma.$disconnect();
    return;
  }

  for (const u of candidates) {
    console.log(
      `- ${u.email ?? "(sans email)"} | ${u.name ?? "—"} | créé ${u.createdAt.toISOString()} | ${u.accountStatus}`,
    );
  }

  if (!apply) {
    console.log("\nRelancez avec --apply pour passer ces comptes en SUSPENDED.");
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.user.updateMany({
    where: { id: { in: candidates.map((u) => u.id) } },
    data: { accountStatus: "SUSPENDED" },
  });

  console.log(`\n${result.count} compte(s) passé(s) en SUSPENDED.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
