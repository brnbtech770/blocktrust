// lib/qstash-scheduler.ts
// Chaînage analyse globale (anomaly detector + Polygon) ~5 min.
// ============================================================

import { Client } from '@upstash/qstash'

export function appBaseUrl(): string | null {
  const trimmed =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  if (!trimmed) return null
  return trimmed.replace(/\/$/, '')
}

export async function scheduleNextSurveillanceRun() {
  const token = process.env.QSTASH_TOKEN?.trim()
  if (!token) {
    console.warn('[qstash] QSTASH_TOKEN manquant — chaîne planifiée ignorée')
    return
  }
  const base = appBaseUrl()
  if (!base) {
    console.warn('[qstash] URL app absente (NEXT_PUBLIC_APP_URL / NEXTAUTH_URL / VERCEL_URL)')
    return
  }

  const qstash = new Client({ token })
  await qstash.publishJSON({
    url: `${base}/api/cron/qstash-surveillance`,
    delay: 300,
    body: { trigger: 'auto' },
  })
}
