import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { secureCompareBearer } from '@/lib/api-key'
import { getOpsHealth } from '@/lib/ops-health'

export const dynamic = 'force-dynamic'

/**
 * Version logique des correctifs auth déployés (incr. à la main quand un fix critique part).
 * 8 : pas de redirect /auth/signin pendant préfetch RSC sur layouts dashboard/admin (évite faux « pas de session »).
 */
const AUTH_RELEASE = 8

/** Préfixe du commit Git qui introduit le marqueur ci-dessus (à titre de référence humaine). */
const EXPECTED_SIGNIN_FIX_COMMIT_PREFIX = '780d893'

const HEALTH_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
} as const

async function pingDatabaseOk(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? ''
  const valid =
    databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')
  if (!valid) return false

  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

/** Accès détail ops : admin connecté ou Bearer CRON_SECRET (monitoring interne). */
async function canAccessDetailedHealth(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret && secureCompareBearer(req.headers.get('authorization'), cronSecret)) {
    return true
  }

  const session = await auth()
  return Boolean(session?.user?.email && isAdmin(session.user.email))
}

/** Réponse publique minimale — pas de fingerprinting infra. */
async function getPublicHealthResponse() {
  const ok = await pingDatabaseOk()
  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
    },
    {
      status: ok ? 200 : 503,
      headers: HEALTH_HEADERS,
    },
  )
}

/** Réponse détaillée réservée admin / Bearer CRON_SECRET. */
async function getDetailedHealthResponse() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  const shaShort = sha ? sha.slice(0, 7) : null
  const looksLikePreSigninFix =
    !!shaShort && shaShort !== EXPECTED_SIGNIN_FIX_COMMIT_PREFIX && shaShort === '5b4c46e'

  const ops = await getOpsHealth()

  const fraudCron = ops.crons.find((c) => c.id === 'fraud-surveillance')
  const subscriptionCron = ops.crons.find((c) => c.id === 'subscription-monitor')

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? ''
  const directUrl = process.env.DIRECT_URL?.trim() ?? ''

  return NextResponse.json(
    {
      ok: ops.ok,
      vercelGitCommitSha: sha || null,
      authRelease: AUTH_RELEASE,
      checkedAt: ops.checkedAt,
      uptimeSec: Math.floor(process.uptime()),
      database: {
        urlConfigured: Boolean(databaseUrl),
        urlValid:
          databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'),
        directUrlConfigured: Boolean(directUrl),
        unpooledConfigured: Boolean(process.env.DATABASE_URL_UNPOOLED?.trim()),
        connected: ops.database.connected,
        latencyMs: ops.database.latencyMs,
        error: ops.database.error,
      },
      services: ops.services,
      qstash: ops.qstash,
      crons: {
        fraudSurveillance: {
          lastRunAt: fraudCron?.lastRunAt ?? null,
          minutesSinceLastRun: fraudCron?.minutesSinceLastRun ?? null,
          stale: fraudCron?.stale ?? true,
          alertInactiveOver10Min:
            fraudCron?.minutesSinceLastRun === null ||
            (fraudCron?.minutesSinceLastRun ?? Infinity) > 10,
        },
        subscriptionMonitor: {
          lastRunAt: subscriptionCron?.lastRunAt ?? null,
          minutesSinceLastRun: subscriptionCron?.minutesSinceLastRun ?? null,
          stale: subscriptionCron?.stale ?? true,
        },
        all: ops.crons,
      },
      alerts: ops.alerts,
      signinGoogleFullPageNav: true,
      signinRedirectReason: true,
      prefetchRscAuthBypass: true,
      expectedSigninFixCommitPrefix: EXPECTED_SIGNIN_FIX_COMMIT_PREFIX,
      authReleaseHint:
        'authRelease 8 : attendre `prefetchRscAuthBypass` true + SHA ≥ 2e792c9 — sinon la prod n’a pas le correctif préfetch dashboard/admin.',
      deployStaleWarning: looksLikePreSigninFix
        ? 'Ce SHA (5b4c46e) est antérieur au correctif Google sign-in pleine page. Redéployez depuis Git (main) ou vérifiez l’échec du build Vercel.'
        : null,
    },
    {
      status: ops.ok ? 200 : 503,
      headers: HEALTH_HEADERS,
    },
  )
}

/** Health check : réponse publique minimale ; détails ops réservés admin / CRON_SECRET. */
export async function GET(req: NextRequest) {
  if (!(await canAccessDetailedHealth(req))) {
    return getPublicHealthResponse()
  }
  return getDetailedHealthResponse()
}
