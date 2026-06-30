/**
 * Synchronise la DB PostgreSQL avec prisma/schema.prisma.
 * 1) prisma migrate deploy (migrations en attente)
 * 2) ADD COLUMN IF NOT EXISTS pour toute colonne manquante (information_schema)
 *
 * Usage prod Neon (URL directe, pas pooler) :
 *   DATABASE_URL="postgresql://..." npx tsx scripts/sync-db-columns.ts
 */
import * as dotenv from 'dotenv'
import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import {
  loadPrismaSchemaColumns,
  resolveDirectDatabaseUrl,
  type ParsedColumn,
} from '@/lib/prisma-schema-sync'
import { ensureDatabaseEnv } from '@/lib/db-env-shim'

dotenv.config({ path: '.env.local' })
dotenv.config()
ensureDatabaseEnv()

function sanitizeDbUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined
  let url = raw.trim().replace(/^\uFEFF/, '')
  url = url.replace(/^(?:DATABASE_URL|DIRECT_URL|DATABASE_URL_PROD)=/i, '').trim()
  const match = url.match(/postgres(?:ql)?:\/\S+/i)
  if (match) url = match[0].replace(/["';]+$/, '')
  return url || undefined
}

const pooledUrl =
  sanitizeDbUrl(process.env.DATABASE_URL) ?? sanitizeDbUrl(process.env.DATABASE_URL_PROD)
const directCandidate =
  sanitizeDbUrl(process.env.DIRECT_URL) ??
  sanitizeDbUrl(process.env.DATABASE_URL_UNPOOLED) ??
  pooledUrl

if (!directCandidate) {
  console.error('❌ DATABASE_URL (ou DIRECT_URL) manquant')
  process.exit(1)
}

const directUrl = resolveDirectDatabaseUrl(directCandidate)

process.env.DATABASE_URL = directUrl
process.env.DIRECT_URL = directUrl

const hostMatch = directUrl.match(/@([^/]+)/)
console.log('🔗 Sync schema Prisma — host:', hostMatch?.[1] ?? '(inconnu)')
console.log('   (connexion directe Neon — DDL)\n')

async function columnExists(
  prisma: PrismaClient,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${table}
      AND column_name = ${column}
  `
  return rows.length > 0
}

async function tableExists(prisma: PrismaClient, table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ${table}
  `
  return rows.length > 0
}

function runMigrateDeploy(): void {
  console.log('📦 Étape 1/2 — prisma migrate deploy…')
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: directUrl, DIRECT_URL: directUrl },
    })
    console.log('✅ migrate deploy terminé\n')
  } catch (err) {
    console.warn('⚠️  migrate deploy a échoué — poursuite avec ADD COLUMN manuels')
    console.warn(err instanceof Error ? err.message : err)
    console.log('')
  }
}

async function syncMissingColumns(
  prisma: PrismaClient,
  columns: ParsedColumn[],
): Promise<string[]> {
  console.log('📦 Étape 2/2 — colonnes manquantes (schema → information_schema)…')
  const added: string[] = []

  for (const { table, column, ddl } of columns) {
    if (!(await tableExists(prisma, table))) continue
    if (await columnExists(prisma, table, column)) continue

    console.warn(`⚠️  manquante : ${table}.${column}`)
    await prisma.$executeRawUnsafe(ddl)

    if (!(await columnExists(prisma, table, column))) {
      throw new Error(`Échec ADD COLUMN ${table}.${column}`)
    }

    console.log(`✅ ajoutée : ${table}.${column}`)
    added.push(`${table}.${column}`)
  }

  return added
}

async function main(): Promise<void> {
  runMigrateDeploy()

  const columns = loadPrismaSchemaColumns()
  const prisma = new PrismaClient({
    datasources: { db: { url: directUrl } },
  })

  try {
    const added = await syncMissingColumns(prisma, columns)

    console.log('\n── Résumé ──')
    if (added.length === 0) {
      console.log('✅ Schema aligné — aucune colonne à ajouter')
    } else {
      console.log(`✅ ${added.length} colonne(s) ajoutée(s) :`)
      for (const col of added) console.log(`   • ${col}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err: unknown) => {
  console.error('❌ sync-db-columns:', err)
  process.exit(1)
})
