/**
 * Neon/Vercel : schema.prisma exige DIRECT_URL (directUrl).
 * L'intégration injecte souvent DATABASE_URL + DATABASE_URL_UNPOOLED sans DIRECT_URL.
 * Sans ce shim au runtime Next.js, Prisma/adapter OAuth échoue → error=Configuration.
 */
function stripWrappingQuotes(value: string): string {
  const t = value.trim()
  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    return t.slice(1, -1).trim()
  }
  return t
}

function normalizeEnvVar(name: string): void {
  const raw = process.env[name]
  if (!raw) return
  let cleaned = stripWrappingQuotes(raw)
  // Corrige les URLs mal saisies : postgresql://postgresql://...
  cleaned = cleaned.replace(/^postgresql:\/\/postgresql:\/\//, 'postgresql://')
  cleaned = cleaned.replace(/^postgres:\/\/postgres:\/\//, 'postgres://')
  if (cleaned !== raw) {
    process.env[name] = cleaned
  }
}

export function ensureDatabaseEnv(): void {
  if (typeof process === 'undefined') return

  for (const key of [
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'DIRECT_URL',
  ] as const) {
    normalizeEnvVar(key)
  }

  if (process.env.DIRECT_URL?.trim()) return

  const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim()
  if (unpooled) {
    process.env.DIRECT_URL = unpooled
    return
  }

  const pooled = process.env.DATABASE_URL?.trim()
  if (pooled?.startsWith('postgresql://') || pooled?.startsWith('postgres://')) {
    process.env.DIRECT_URL = pooled
  }
}

ensureDatabaseEnv()
