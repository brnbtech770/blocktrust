/**
 * Vérifie les colonnes critiques en prod et les crée si absentes (drift migration / bases Neon divergentes).
 * Usage : DATABASE_URL="postgresql://..." npx tsx scripts/check-prod-db.ts
 */
import { PrismaClient } from "@prisma/client";

type CriticalColumn = {
  table: string;
  column: string;
  ddl: string;
};

const criticalColumns: CriticalColumn[] = [
  {
    table: "User",
    column: "biometricConsentAt",
    ddl: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "biometricConsentAt" TIMESTAMP(3)`,
  },
  {
    table: "User",
    column: "biometricConsentVersion",
    ddl: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "biometricConsentVersion" TEXT`,
  },
  {
    table: "User",
    column: "trustScore",
    ddl: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trustScore" INTEGER NOT NULL DEFAULT 0`,
  },
  {
    table: "User",
    column: "extensionApiKey",
    ddl: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "extensionApiKey" TEXT`,
  },
  {
    table: "Certificate",
    column: "blockchainStatus",
    ddl: `ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "blockchainStatus" TEXT NOT NULL DEFAULT 'PENDING'`,
  },
];

const databaseUrl =
  process.env.DATABASE_URL?.trim() ?? process.env.DATABASE_URL_PROD?.trim();

if (!databaseUrl) {
  console.error("❌ DATABASE_URL (ou DATABASE_URL_PROD) manquant");
  process.exit(1);
}

const hostMatch = databaseUrl.match(/@([^/]+)/);
console.log("🔗 Vérification schema — host:", hostMatch?.[1] ?? "(inconnu)");

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function checkProdDb(): Promise<void> {
  let repaired = 0;

  try {
    for (const { table, column, ddl } of criticalColumns) {
      const exists = await columnExists(table, column);
      if (exists) {
        console.log(`✓ ${table}.${column}`);
        continue;
      }

      console.warn(
        `⚠️  COLONNE MANQUANTE : ${table}.${column} — création automatique…`
      );
      await prisma.$executeRawUnsafe(ddl);
      const ok = await columnExists(table, column);
      if (!ok) {
        throw new Error(`Échec création ${table}.${column}`);
      }
      console.log(`✅ ${table}.${column} créée`);
      repaired += 1;
    }

    if (repaired === 0) {
      console.log("✅ Schema OK — toutes les colonnes critiques sont présentes");
    } else {
      console.log(`✅ ${repaired} colonne(s) réparée(s) automatiquement`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkProdDb().catch((err: unknown) => {
  console.error("❌ check-prod-db:", err);
  process.exit(1);
});
