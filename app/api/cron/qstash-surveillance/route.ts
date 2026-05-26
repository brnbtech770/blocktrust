// app/api/cron/qstash-surveillance/route.ts
// Analyse globale déclenchée par QStash (~5 min) — agents fraude, sécurité, onboarding
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { runAnomalyDetection } from '@/lib/agents/anomaly-detector'
import { runFraudSurveillance } from '@/lib/agents/fraud-surveillance'
import { runSecurityMonitor } from '@/lib/agents/security-monitor'
import { runOnboardingMonitor } from '@/lib/agents/onboarding-monitor'
import { shouldRunAgent } from '@/lib/agents/agent-utils'
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

async function runAgentSafe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (e) {
    console.error(`[qstash-surveillance] ${label} failed:`, e)
    return null
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
  const anomaly = await runAgentSafe('anomaly-detection', runAnomalyDetection)
  const fraud = await runAgentSafe('fraud-surveillance', runFraudSurveillance)

  let security = null
  if (await shouldRunAgent('security-monitor', 'SECURITY_MONITOR_RUN', 15 * 60 * 1000)) {
    security = await runAgentSafe('security-monitor', runSecurityMonitor)
  }

  let onboarding = null
  if (await shouldRunAgent('onboarding-monitor', 'ONBOARDING_MONITOR_RUN', 24 * 60 * 60 * 1000)) {
    onboarding = await runAgentSafe('onboarding-monitor', runOnboardingMonitor)
  }

  const polygon = await runPolygonRetrySafe()

  try {
    await scheduleNextSurveillanceRun()
  } catch (scheduleErr) {
    console.error('[qstash-surveillance] programme suivant ignoré:', scheduleErr)
  }

  return NextResponse.json({
    success: true,
    anomaly,
    fraud,
    security,
    onboarding,
    polygon,
  })
}

async function disabledPost() {
  return NextResponse.json(
    { error: 'QStash signing keys ou URL publique non configurées' },
    { status: 503 },
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
