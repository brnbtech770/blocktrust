// app/api/cron/qstash-surveillance/route.ts
// Analyse globale déclenchée par QStash (~5 min) — signature Receiver.
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { runAnomalyDetection } from '@/lib/agents/anomaly-detector'
import { retryFailedAnchors } from '@/lib/polygon'
import { scheduleNextSurveillanceRun } from '@/lib/qstash-scheduler'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

async function runPolygonRetrySafe() {
  try {
    return await retryFailedAnchors(25)
  } catch (e) {
    console.error('[cron/qstash-surveillance] polygon retry failed:', e)
    return { skipped: true, examined: 0, anchored: 0, failed: 0, noHash: 0 }
  }
}

function qstashRouteUrl(): string | undefined {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  const clean = base.replace(/\/$/, '')
  if (!clean) return undefined
  return `${clean}/api/cron/qstash-surveillance`
}

async function handle(_req: NextRequest) {
  try {
    const result = await runAnomalyDetection()
    const polygon = await runPolygonRetrySafe()
    try {
      await scheduleNextSurveillanceRun()
    } catch (scheduleErr) {
      console.error('[qstash-surveillance] programme suivant ignoré:', scheduleErr)
    }
    return NextResponse.json({ success: true, ...result, polygon })
  } catch (e) {
    console.error('[qstash-surveillance]', e)
    return NextResponse.json({ error: 'Agent failed' }, { status: 500 })
  }
}

async function disabledPost() {
  return NextResponse.json(
    { error: 'QStash signing keys ou URL publique non configurées' },
    { status: 503 }
  )
}

function buildPost(): (req: NextRequest) => Promise<Response> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim()
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim()
  const url = qstashRouteUrl()

  if (!currentSigningKey || !nextSigningKey || !url) {
    return disabledPost
  }

  return verifySignatureAppRouter(handle, {
    currentSigningKey,
    nextSigningKey,
    url,
  }) as (req: NextRequest) => Promise<Response>
}

export const POST = buildPost()
