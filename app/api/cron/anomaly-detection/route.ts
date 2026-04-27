// app/api/cron/anomaly-detection/route.ts
// Cron Vercel (GET + Bearer CRON_SECRET) ou déclenchement manuel admin (POST).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { runAnomalyDetection } from '@/lib/agents/anomaly-detector'
import { retryFailedAnchors } from '@/lib/polygon'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

async function runPolygonRetrySafe() {
  try {
    return await retryFailedAnchors(25)
  } catch (e) {
    console.error('[cron/anomaly-detection] polygon retry failed:', e)
    return { skipped: true, examined: 0, anchored: 0, failed: 0, noHash: 0 }
  }
}

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
    const result = await runAnomalyDetection()
    const polygon = await runPolygonRetrySafe()
    return NextResponse.json({ success: true, ...result, polygon })
  } catch (e) {
    console.error('[cron/anomaly-detection]', e)
    return NextResponse.json({ error: 'Agent failed' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const result = await runAnomalyDetection()
    const polygon = await runPolygonRetrySafe()
    return NextResponse.json({ success: true, ...result, polygon })
  } catch (e) {
    console.error('[cron/anomaly-detection POST]', e)
    return NextResponse.json({ error: 'Agent failed' }, { status: 500 })
  }
}
