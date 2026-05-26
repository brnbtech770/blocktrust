import { NextResponse } from 'next/server'
import '@/lib/db-env-shim'
import { prisma } from '@/app/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Version logique des correctifs auth déployés (incr. à la main quand un fix critique part).
 * 8 : pas de redirect /auth/signin pendant préfetch RSC sur layouts dashboard/admin (évite faux « pas de session »).
 */
const AUTH_RELEASE = 8

/** Préfixe du commit Git qui introduit le marqueur ci-dessus (à titre de référence humaine). */
const EXPECTED_SIGNIN_FIX_COMMIT_PREFIX = '780d893'

/** Vérif rapide du déploiement : commit Git exposé par Vercel (sans secrets). */
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  const shaShort = sha ? sha.slice(0, 7) : null
  const looksLikePreSigninFix =
    !!shaShort && shaShort !== EXPECTED_SIGNIN_FIX_COMMIT_PREFIX && shaShort === '5b4c46e'

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? ''
  const directUrl = process.env.DIRECT_URL?.trim() ?? ''
  const databaseUrlValid =
    databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')

  let dbOk = false
  let dbLatencyMs: number | null = null
  let dbError: string | null = null

  if (databaseUrlValid) {
    const started = Date.now()
    try {
      await prisma.$queryRaw`SELECT 1`
      dbOk = true
      dbLatencyMs = Date.now() - started
    } catch (err: unknown) {
      dbLatencyMs = Date.now() - started
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      dbError = msg.replace(/postgresql:\/\/[^\s]+/gi, '[redacted]').slice(0, 160)
    }
  } else {
    dbError = databaseUrl
      ? 'DATABASE_URL invalide (doit commencer par postgresql://)'
      : 'DATABASE_URL absent'
  }

  return NextResponse.json(
    {
      ok: dbOk,
      vercelGitCommitSha: sha || null,
      authRelease: AUTH_RELEASE,
      database: {
        urlConfigured: Boolean(databaseUrl),
        urlValid: databaseUrlValid,
        directUrlConfigured: Boolean(directUrl),
        unpooledConfigured: Boolean(process.env.DATABASE_URL_UNPOOLED?.trim()),
        connected: dbOk,
        latencyMs: dbLatencyMs,
        error: dbError,
      },
      /** Présent seulement sur les builds contenant ce fichier ; vérifie que la prod n’est pas figée sur un vieux déploiement. */
      signinGoogleFullPageNav: true,
      /** Présent à partir du commit qui ajoute ?reason= sur les redirects dashboard/admin. */
      signinRedirectReason: true,
      /** Build avec bypass redirect signin si préfetch RSC (commit 2e792c9+). */
      prefetchRscAuthBypass: true,
      expectedSigninFixCommitPrefix: EXPECTED_SIGNIN_FIX_COMMIT_PREFIX,
      authReleaseHint:
        'authRelease 8 : attendre `prefetchRscAuthBypass` true + SHA ≥ 2e792c9 — sinon la prod n’a pas le correctif préfetch dashboard/admin.',
      deployStaleWarning: looksLikePreSigninFix
        ? 'Ce SHA (5b4c46e) est antérieur au correctif Google sign-in pleine page. Redéployez depuis Git (main) ou vérifiez l’échec du build Vercel.'
        : null,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      },
    }
  )
}
