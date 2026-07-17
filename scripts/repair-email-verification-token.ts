/**
 * Réparation idempotente — table EmailVerificationToken absente (drift Neon pooler/direct).
 * Exécuter après `prisma migrate deploy` si les tests E2E signalent P2021.
 *
 * Usage : npx tsx scripts/repair-email-verification-token.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { prisma } from "../app/lib/db";

async function main() {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'EmailVerificationToken'
    ) AS exists
  `;

  if (rows[0]?.exists) {
    console.log("✅ EmailVerificationToken déjà présente");
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE "EmailVerificationToken" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key"
    ON "EmailVerificationToken"("tokenHash")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX "EmailVerificationToken_userId_idx"
    ON "EmailVerificationToken"("userId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX "EmailVerificationToken_expiresAt_idx"
    ON "EmailVerificationToken"("expiresAt")
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
  `);

  console.log("✅ Table EmailVerificationToken créée (réparation drift)");
}

main()
  .catch((err) => {
    console.error("❌ Réparation EmailVerificationToken:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
