/**
 * Met à jour User.trustScore + TrustScore entité à 100 pour les comptes officiels.
 * Corrige les entités marquées à tort (email non officiel, ex. 1rst.invest@gmail.com).
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
  isOfficialEntity,
  isOfficialRootOfTrustEmail,
  KNOWN_FALSE_OFFICIAL_ENTITY_EMAILS,
  OFFICIAL_TRUST_SCORE,
} from "@/lib/official-trust";
import { computeTrustEngineScore } from "@/lib/trust-engine";
import { invalidateTrustEngineCache } from "@/lib/trust-engine-cache";

const dryRun = process.argv.includes("--dry-run");

async function purgeCertCache(
  certificates: Array<{ id: string; publicId: string | null }>,
  keys: string[],
) {
  for (const cert of certificates) {
    keys.push(cert.id);
    if (cert.publicId) keys.push(cert.publicId);
  }
}

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

  const officialEntities = await prisma.entity.findMany({
    where: {
      OR: officialEmails.map((email) => ({
        email: { equals: email, mode: "insensitive" as const },
      })),
    },
    select: {
      id: true,
      email: true,
      certificates: { select: { id: true, publicId: true, status: true } },
    },
  });

  let entitiesUpdated = 0;
  const cacheKeys: string[] = [];

  for (const entity of officialEntities) {
    if (!isOfficialEntity(entity.email)) continue;

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

    await purgeCertCache(entity.certificates, cacheKeys);
    entitiesUpdated += 1;
  }

  // Entités marquées à tort : score 100 en DB mais email non officiel
  const falseOfficialEntities = await prisma.entity.findMany({
    where: {
      OR: [
        {
          trustScore: { score: OFFICIAL_TRUST_SCORE },
          NOT: {
            OR: officialEmails.map((email) => ({
              email: { equals: email, mode: "insensitive" as const },
            })),
          },
        },
        ...KNOWN_FALSE_OFFICIAL_ENTITY_EMAILS.map((email) => ({
          email: { equals: email, mode: "insensitive" as const },
        })),
      ],
    },
    select: {
      id: true,
      email: true,
      certificates: {
        select: { id: true, publicId: true, status: true },
        orderBy: { issuedAt: "desc" },
        take: 1,
      },
    },
  });

  let entitiesCorrected = 0;

  for (const entity of falseOfficialEntities) {
    if (isOfficialRootOfTrustEmail(entity.email)) continue;

    const cert = entity.certificates[0];
    let correctedScore = 0;

    if (cert && cert.status !== "REVOKED") {
      const engine = await computeTrustEngineScore(cert.id);
      correctedScore = engine.globalScore;
    }

    if (dryRun) {
      console.log(
        `[dry-run] Correctif ${entity.email} → TrustScore=${correctedScore} (was wrongly official)`,
      );
    } else {
      const existing = await prisma.trustScore.findUnique({
        where: { entityId: entity.id },
      });
      if (existing) {
        await prisma.trustScore.update({
          where: { entityId: entity.id },
          data: {
            score: correctedScore,
            lastCalculated: new Date(),
            level: correctedScore >= 80 ? "TRUSTED" : correctedScore >= 50 ? "STANDARD" : "UNVERIFIED",
          },
        });
      }
    }

    await purgeCertCache(entity.certificates, cacheKeys);
    entitiesCorrected += 1;
  }

  if (!dryRun && cacheKeys.length > 0) {
    await invalidateTrustEngineCache(...[...new Set(cacheKeys)]);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        usersUpdated,
        entitiesUpdated,
        entitiesCorrected,
        cacheKeysPurged: dryRun ? 0 : [...new Set(cacheKeys)].length,
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
