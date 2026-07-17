import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { prisma } from "../app/lib/db";

async function main() {
  const tables = await prisma.$queryRaw<
    Array<{ table_name: string }>
  >`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('EmailVerificationToken', 'User') ORDER BY table_name`;

  const migrations = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null }>
  >`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10`;

  const ready = await prisma.$queryRaw<
    Array<{ enum_ok: boolean; table_ok: boolean }>
  >`
    SELECT
      EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'UserAccountStatus'
      ) AS enum_ok,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'EmailVerificationToken'
      ) AS table_ok
  `;

  console.log("tables:", tables);
  console.log("email migrations:", migrations);
  console.log("e2e ready:", ready[0]);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
