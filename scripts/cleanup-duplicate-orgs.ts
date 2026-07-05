/**
 * Supprime les organisations en doublon (même ownerId + même nom, casse ignorée).
 * Conserve la plus ancienne ; supprime les autres si elles n'ont qu'un seul membre (OWNER).
 *
 * Exécution : npx tsx scripts/cleanup-duplicate-orgs.ts [--dry-run]
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { prisma } from "@/app/lib/db";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      createdAt: true,
      _count: { select: { members: true, vaults: true, entities: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof orgs>();
  for (const o of orgs) {
    const key = `${o.ownerId}::${o.name.trim().toLowerCase()}`;
    const list = groups.get(key) ?? [];
    list.push(o);
    groups.set(key, list);
  }

  let removed = 0;
  for (const [, list] of groups) {
    if (list.length < 2) continue;
    const [keep, ...dupes] = list;
    console.log(`\nGarder: ${keep.name} (${keep.slug}) id=${keep.id}`);
    for (const d of dupes) {
      const safe =
        d._count.vaults === 0 &&
        d._count.entities === 0 &&
        d._count.members <= 1;
      console.log(
        `  Doublon: ${d.slug} id=${d.id} members=${d._count.members} vaults=${d._count.vaults} entities=${d._count.entities} ${safe ? "→ SUPPRIMER" : "→ SKIP (données)"}`,
      );
      if (safe && !dryRun) {
        await prisma.organization.delete({ where: { id: d.id } });
        removed += 1;
      }
    }
  }

  console.log(
    dryRun
      ? `\n[DRY-RUN] Aucune suppression. Relancez sans --dry-run pour appliquer.`
      : `\n${removed} organisation(s) doublon supprimée(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
