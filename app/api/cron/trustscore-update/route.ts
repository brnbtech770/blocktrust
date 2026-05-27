// Cron Vercel — GET + Bearer CRON_SECRET (quotidien).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { runTrustScoreUpdate } from '@/lib/agents/trustscore-updater'
import { captureCronFailure } from '@/lib/cron-sentry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function unauthorizedCron() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET non configuré' },
      { status: 503 }
    )
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return unauthorizedCron()
  }

  try {
    const result = await runTrustScoreUpdate()
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    captureCronFailure('trustscore-update', e)
    return NextResponse.json({ error: 'TrustScore update failed' }, { status: 500 })
  }
}
