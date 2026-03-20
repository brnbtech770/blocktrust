import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Vérif rapide du déploiement : commit Git exposé par Vercel (sans secrets). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    debugAuthExpectedFields: ['debugAuthVersion', 'layoutDiagnostic'] as const,
  })
}
