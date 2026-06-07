/**
 * Repair one-shot — colonnes biometricConsent sur la base Neon prod (bold-frost / vercel-dev).
 * Usage : DATABASE_URL_PROD="postgresql://..." npx tsx scripts/fix-prod-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prodUrl = process.env.DATABASE_URL_PROD?.trim();

if (!prodUrl) {
  console.error("❌ DATABASE_URL_PROD manquant");
  process.exit(1);
}

const hostMatch = prodUrl.match(/@([^/]+)/);
console.log(
  "🔗 Cible:",
  hostMatch?.[1] ?? "(host inconnu)",
);

// Standalone : PrismaClient dédié (DATABASE_URL_PROD explicite — hors singleton app).
const prisma = new PrismaClient({
  datasources: {
    db: { url: prodUrl },
  },
});

async function fix() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "biometricConsentAt" TIMESTAMP(3)
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "biometricConsentVersion" TEXT
    `);
    console.log("✅ Colonnes ajoutées sur la base prod");

    const result = await prisma.$queryRaw<
      { column_name: string }[]
    >`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'User' 
        AND column_name IN ('biometricConsentAt', 'biometricConsentVersion')
      ORDER BY column_name
    `;
    console.log("Colonnes présentes:", result);
  } finally {
    await prisma.$disconnect();
  }
}

fix().catch((err: unknown) => {
  console.error("❌ Échec:", err);
  process.exit(1);
});
