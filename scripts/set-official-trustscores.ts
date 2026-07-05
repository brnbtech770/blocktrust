/**
 * Met à jour User.trustScore + TrustScore entité à 100 pour les comptes officiels.
 * Purge le cache Redis te:score:* des certificats concernés.
 *
 * Exécution : npx tsx scripts/set-official-trustscores.ts [--dry-run]
 */
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { prisma } from "@/app/lib/db";
import {
  getOfficialRootOfTrustEmails,
  isOfficialRootOfTrustEntity,
  OFFICIAL_TRUST_SCORE,
} from "@/lib/official-trust";
import { invalidateTrustEngineCache } from "@/lib/trust-engine-cache";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const officialEmails = getOfficialRootOfTrustEmails();
  console.log(`[official-trust] ${officialEmails.length} email(s) officiel(s)`);

  const users = await prisma.user.findMany({
    where: {
      OR: officialEmails.map((email) => ({
        email: { equals: email, mode: "insensitive" as const },
      })),
    },
    select: { id: true, email: true },
  });

  let usersUpdated = 0;
  for (const user of users) {
    if (dryRun) {
      console.log(`[dry-run] User ${user.email} → trustScore=${OFFICIAL_TRUST_SCORE}`);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { trustScore: OFFICIAL_TRUST_SCORE, trustScoreAt: new Date() },
      });
    }
    usersUpdated += 1;
  }

  const entities = await prisma.entity.findMany({
    where: {
      OR: [
        ...officialEmails.map((email) => ({
          email: { equals: email, mode: "insensitive" as const },
        })),
        {
          user: {
            email: {
              in: officialEmails,
              mode: "insensitive" as const,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      user: { select: { email: true } },
      certificates: { select: { id: true, publicId: true, status: true } },
    },
  });

  let entitiesUpdated = 0;
  const cacheKeys: string[] = [];

  for (const entity of entities) {
    if (
      !isOfficialRootOfTrustEntity(entity.email, entity.user.email)
    ) {
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] Entity ${entity.email} → TrustScore=${OFFICIAL_TRUST_SCORE}`);
    } else {
      await prisma.trustScore.upsert({
        where: { entityId: entity.id },
        create: {
          entityId: entity.id,
          score: OFFICIAL_TRUST_SCORE,
          kycScore: OFFICIAL_TRUST_SCORE,
          historyScore: OFFICIAL_TRUST_SCORE,
          interactionScore: OFFICIAL_TRUST_SCORE,
          behaviorScore: OFFICIAL_TRUST_SCORE,
          networkScore: OFFICIAL_TRUST_SCORE,
          level: "TRUSTED",
          lastCalculated: new Date(),
        },
        update: {
          score: OFFICIAL_TRUST_SCORE,
          kycScore: OFFICIAL_TRUST_SCORE,
          historyScore: OFFICIAL_TRUST_SCORE,
          interactionScore: OFFICIAL_TRUST_SCORE,
          behaviorScore: OFFICIAL_TRUST_SCORE,
          networkScore: OFFICIAL_TRUST_SCORE,
          level: "TRUSTED",
          lastCalculated: new Date(),
        },
      });
    }

    for (const cert of entity.certificates) {
      cacheKeys.push(cert.id);
      if (cert.publicId) cacheKeys.push(cert.publicId);
    }
    entitiesUpdated += 1;
  }

  if (!dryRun && cacheKeys.length > 0) {
    await invalidateTrustEngineCache(...cacheKeys);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        usersUpdated,
        entitiesUpdated,
        cacheKeysPurged: dryRun ? 0 : cacheKeys.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
