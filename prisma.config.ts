// prisma.config.ts
// Config Prisma CLI (remplace le bloc package.json#prisma deprecated avant Prisma 7).
// Doc : https://pris.ly/prisma-config
// ============================================================

import "dotenv/config";
import { defineConfig } from "prisma/config";

// Intégration Neon/Vercel : DATABASE_URL (pooler) + DATABASE_URL_UNPOOLED (direct).
// schema.prisma attend DIRECT_URL pour migrations — miroir si absent.
if (
  typeof process !== "undefined" &&
  !process.env.DIRECT_URL?.trim() &&
  process.env.DATABASE_URL_UNPOOLED?.trim()
) {
  process.env.DIRECT_URL = process.env.DATABASE_URL_UNPOOLED.trim();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
});
