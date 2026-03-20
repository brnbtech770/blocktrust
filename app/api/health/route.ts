import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Version logique des correctifs auth déployés (incr. à la main quand un fix critique part).
 * 5 : shim AUTH_TRUST_HOST + debug-auth hostVsNextAuth (v5).
 */
const AUTH_RELEASE = 5

/** Vérif rapide du déploiement : commit Git exposé par Vercel (sans secrets). */
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  return NextResponse.json({
    ok: true,
    vercelGitCommitSha: sha || null,
    authRelease: AUTH_RELEASE,
    authReleaseHint:
      'authRelease 5 : attendre debug-auth debugAuthVersion 5 + hostVsNextAuth.aligned true en prod.',
    debugAuthExpectedFields: ['debugAuthVersion', 'layoutDiagnostic', 'hostVsNextAuth'] as const,
  })
}
