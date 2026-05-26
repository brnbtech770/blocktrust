// prisma.config.ts
// Config Prisma CLI (remplace le bloc package.json#prisma deprecated avant Prisma 7).
// Doc : https://pris.ly/prisma-config
// ============================================================

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";
import { ensureDatabaseEnv } from "./lib/db-env-shim";

/**
 * Aligné sur Next.js : .env puis .env.local (override).
 * `import "dotenv/config"` seul ne charge pas .env.local → migrations sur la mauvaise base Neon.
 */
function loadProjectEnv(): void {
  const root = process.cwd();
  loadEnv({ path: resolve(root, ".env") });
  loadEnv({ path: resolve(root, ".env.local"), override: true });
  // .env.production.local uniquement en contexte prod explicite (pas pour migrate local)
  if (process.env.NODE_ENV === "production") {
    loadEnv({ path: resolve(root, ".env.production.local"), override: true });
  }
}

loadProjectEnv();
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
        "   Les migrations peuvent s'appliquer sur une base et l'app en utiliser une autre."
      );
    }
  } catch {
    console.warn(
      "⚠️  Impossible de comparer DATABASE_URL et DIRECT_URL (URL invalide)"
    );
  }
}

function logDatabaseTarget(): void {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.warn("⚠️  [prisma.config] DATABASE_URL absent");
    return;
  }
  try {
    console.log(
      `[prisma.config] DATABASE_URL host: ${new URL(databaseUrl).hostname}`
    );
  } catch {
    console.warn("⚠️  [prisma.config] DATABASE_URL invalide");
  }
}

warnIfDatabaseHostsMismatch();
logDatabaseTarget();

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const directUrl = process.env.DIRECT_URL?.trim();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: databaseUrl,
    ...(directUrl ? { directUrl } : {}),
  },
});
