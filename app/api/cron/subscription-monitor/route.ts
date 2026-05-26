// app/api/cron/subscription-monitor/route.ts
// Cron horaire — rappels abonnement + cache MRR
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { runSubscriptionMonitor } from '@/lib/agents/subscription-monitor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

function unauthorizedCron() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return unauthorizedCron()
  }

  try {
    const result = await runSubscriptionMonitor()
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.error('[cron/subscription-monitor]', e)
    return NextResponse.json({ error: 'Agent failed' }, { status: 500 })
  }
}
