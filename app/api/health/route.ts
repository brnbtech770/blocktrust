import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Version logique des correctifs auth déployés (incr. à la main quand un fix critique part).
 * >= 3 : inclut le fix JWT « pas de double Prisma au 1er OAuth » (ancêtre git dd9340f) + cet endpoint enrichi.
 */
const AUTH_RELEASE = 3

/** Vérif rapide du déploiement : commit Git exposé par Vercel (sans secrets). */
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  return NextResponse.json({
    ok: true,
    vercelGitCommitSha: sha || null,
    authRelease: AUTH_RELEASE,
    authReleaseHint:
      'Prod doit afficher authRelease >= 3 si Vercel suit main ; sinon redeploy / erreur de build.',
    debugAuthExpectedFields: ['debugAuthVersion', 'layoutDiagnostic'] as const,
  })
}
