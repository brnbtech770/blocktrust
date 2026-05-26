// prisma.config.ts
// Config Prisma CLI (remplace le bloc package.json#prisma deprecated avant Prisma 7).
// Doc : https://pris.ly/prisma-config
// ============================================================

import "dotenv/config";
import { defineConfig } from "prisma/config";
import { ensureDatabaseEnv } from "./lib/db-env-shim";

ensureDatabaseEnv();

function normalizeNeonHost(hostname: string): string {
  return hostname.replace(/-pooler\./, ".");
}

function warnIfDatabaseHostsMismatch(): void {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const directUrl =
    process.env.DIRECT_URL?.trim() ??
    process.env.DATABASE_URL_UNPOOLED?.trim();

  if (!databaseUrl || !directUrl) return;

  try {
    const dbHost = new URL(databaseUrl).hostname;
    const directHost = new URL(directUrl).hostname;
    if (normalizeNeonHost(dbHost) !== normalizeNeonHost(directHost)) {
      console.warn(
        "⚠️  DATABASE_URL et DIRECT_URL pointent vers des bases Neon différentes !"
      );
      console.warn(`   DATABASE_URL host : ${dbHost}`);
      console.warn(`   DIRECT_URL host   : ${directHost}`);
      console.warn(
        "   Les migrations peuvent s’appliquer sur une base et l’app en utiliser une autre."
      );
    }
  } catch {
    console.warn("⚠️  Impossible de comparer DATABASE_URL et DIRECT_URL (URL invalide)");
  }
}

warnIfDatabaseHostsMismatch();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
});
