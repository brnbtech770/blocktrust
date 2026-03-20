import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Version logique des correctifs auth déployés (incr. à la main quand un fix critique part).
 * 7 : redirect signin avec ?reason= (no-session-cookie | jwt-cookie-unreadable | user-not-in-db).
 */
const AUTH_RELEASE = 7

/** Préfixe du commit Git qui introduit le marqueur ci-dessus (à titre de référence humaine). */
const EXPECTED_SIGNIN_FIX_COMMIT_PREFIX = '780d893'

/** Vérif rapide du déploiement : commit Git exposé par Vercel (sans secrets). */
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  const shaShort = sha ? sha.slice(0, 7) : null
  const looksLikePreSigninFix =
    !!shaShort && shaShort !== EXPECTED_SIGNIN_FIX_COMMIT_PREFIX && shaShort === '5b4c46e'
  return NextResponse.json(
    {
      ok: true,
      vercelGitCommitSha: sha || null,
      authRelease: AUTH_RELEASE,
      /** Présent seulement sur les builds contenant ce fichier ; vérifie que la prod n’est pas figée sur un vieux déploiement. */
    signinGoogleFullPageNav: true,
    /** Présent à partir du commit qui ajoute ?reason= sur les redirects dashboard/admin. */
    signinRedirectReason: true,
    expectedSigninFixCommitPrefix: EXPECTED_SIGNIN_FIX_COMMIT_PREFIX,
    authReleaseHint:
      'authRelease 7 : comparer `vercelGitCommitSha` à `origin/main` sur GitHub — s’ils diffèrent, la prod n’a pas le dernier build (pas de ?reason= sur /auth/signin).',
      deployStaleWarning: looksLikePreSigninFix
        ? 'Ce SHA (5b4c46e) est antérieur au correctif Google sign-in pleine page. Redéployez depuis Git (main) ou vérifiez l’échec du build Vercel.'
        : null,
      debugAuthExpectedFields: ['debugAuthVersion', 'layoutDiagnostic', 'hostVsNextAuth'] as const,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      },
    }
  )
}
