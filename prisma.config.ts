// prisma.config.ts
// Config Prisma CLI (remplace le bloc package.json#prisma deprecated avant Prisma 7).
// Doc : https://pris.ly/prisma-config
// ============================================================

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
});
