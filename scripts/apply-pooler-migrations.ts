/**
 * Applique les migrations Prisma en attente sur DATABASE_URL (pooler = base app).
 * Contourne le décalage DIRECT_URL / DATABASE_URL sur Neon.
 * Usage : npx tsx scripts/apply-pooler-migrations.ts
 */
import { config } from 'dotenv'
import { createHash, randomUUID } from 'crypto'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

config({ path: resolve('.env') })
config({ path: resolve('.env.local'), override: true })

const DATABASE_URL = process.env.DATABASE_URL?.trim()
if (!DATABASE_URL) {
  console.error('DATABASE_URL absent')
  process.exit(1)
}
const dbUrl: string = DATABASE_URL

const PENDING = [
  '20260601180000_subscription_seats_extra_profiles',
  '20260602010000_hash_at_rest_reset_token_apikey',
  '20260602020000_processed_stripe_event',
  '20260604140000_cgv_retractation_consent',
  '20260607180000_subscription_default_discovery',
  '20260607190000_validation_level_plan_codes',
] as const

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
})

function migrationChecksum(name: string): string {
  const file = resolve(`prisma/migrations/${name}/migration.sql`)
  const sql = readFileSync(file, 'utf8')
  return createHash('sha256').update(sql).digest('hex')
}

function runSqlFile(name: string): void {
  const file = resolve(`prisma/migrations/${name}/migration.sql`)
  execSync(
    `npx prisma db execute --url "${dbUrl.replace(/"/g, '\\"')}" --file "${file}"`,
    { stdio: 'inherit', cwd: resolve('.') },
  )
}

async function isApplied(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT count(*)::int AS n FROM "_prisma_migrations"
    WHERE migration_name = ${name} AND finished_at IS NOT NULL
  `
  return (rows[0]?.n ?? 0) > 0
}

async function markApplied(name: string, checksum: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "_prisma_migrations" (
      id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      ${randomUUID()}, ${checksum}, NOW(), ${name}, NULL, NULL, NOW(), 1
    )
  `
}

async function main() {
  console.log('Cible : DATABASE_URL (pooler — base utilisée par l’app)\n')

  for (const name of PENDING) {
    if (await isApplied(name)) {
      console.log(`⏭  ${name} — déjà enregistrée`)
      continue
    }

    const checksum = migrationChecksum(name)
    console.log(`▶  ${name}`)
    try {
      runSqlFile(name)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('already exists')) {
        console.warn(`   ⚠ SQL partiel (déjà appliqué) — enregistrement quand même`)
      } else {
        throw err
      }
    }

    await markApplied(name, checksum)
    console.log(`   ✓ enregistrée\n`)
  }

  const enums = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT enumlabel FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ValidationLevel'
    ORDER BY enumsortorder
  `
  console.log('ValidationLevel :', enums.map((e) => e.enumlabel).join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
