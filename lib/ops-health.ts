// lib/ops-health.ts
// État ops : services externes + dernières exécutions des crons
// ============================================================

import '@/lib/db-env-shim'
import { prisma } from '@/app/lib/db'
import { isPolygonConfigured } from '@/lib/polygon'

export type ServiceStatus = 'ok' | 'degraded' | 'down' | 'unconfigured'

export type ServiceHealth = {
  name: string
  status: ServiceStatus
  configured: boolean
  latencyMs: number | null
  detail: string | null
}

export type CronHealth = {
  id: string
  label: string
  lastRunAt: string | null
  stale: boolean
  staleThresholdMinutes: number
  minutesSinceLastRun: number | null
}

export type OpsHealthPayload = {
  ok: boolean
  checkedAt: string
  vercelGitCommitSha: string | null
  database: {
    connected: boolean
    latencyMs: number | null
    error: string | null
  }
  services: {
    database: ServiceHealth
    qstash: ServiceHealth
    stripe: ServiceHealth
    resend: ServiceHealth
    polygon: ServiceHealth
  }
  crons: CronHealth[]
  qstash: {
    configured: boolean
    signingKeysConfigured: boolean
    pingOk: boolean
    latencyMs: number | null
    error: string | null
  }
  alerts: string[]
}

const CRON_DEFS = [
  {
    id: 'fraud-surveillance',
    label: 'Agent Fraude (QStash)',
    action: 'FRAUD_SURVEILLANCE_RUN',
    resourceId: 'fraud-surveillance',
    staleMinutes: 10,
  },
  {
    id: 'subscription-monitor',
    label: 'Agent Abonnements',
    action: 'SUBSCRIPTION_MONITOR_RUN',
    resourceId: 'subscription-monitor',
    staleMinutes: 70,
  },
  {
    id: 'anomaly-detector',
    label: 'Détection anomalies',
    action: 'ANOMALY_DETECTOR_RUN',
    resourceId: 'anomaly-detector',
    staleMinutes: 15,
  },
  {
    id: 'security-monitor',
    label: 'Agent Sécurité',
    action: 'SECURITY_MONITOR_RUN',
    resourceId: 'security-monitor',
    staleMinutes: 20,
  },
  {
    id: 'onboarding-monitor',
    label: 'Agent Onboarding',
    action: 'ONBOARDING_MONITOR_RUN',
    resourceId: 'onboarding-monitor',
    staleMinutes: 1500,
  },
] as const

async function getLastCronRun(
  action: string,
  resourceId: string,
): Promise<Date | null> {
  const row = await prisma.auditLog
    .findFirst({
      where: { action, resource: 'agent', resourceId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    .catch(() => null)
  return row?.createdAt ?? null
}

async function checkDatabase(): Promise<{
  connected: boolean
  latencyMs: number | null
  error: string | null
}> {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? ''
  const valid =
    databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')
  if (!valid) {
    return {
      connected: false,
      latencyMs: null,
      error: databaseUrl ? 'DATABASE_URL invalide' : 'DATABASE_URL absent',
    }
  }

  const started = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { connected: true, latencyMs: Date.now() - started, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return {
      connected: false,
      latencyMs: Date.now() - started,
      error: msg.replace(/postgresql:\/\/[^\s]+/gi, '[redacted]').slice(0, 160),
    }
  }
}

async function pingQStash(): Promise<{
  configured: boolean
  pingOk: boolean
  latencyMs: number | null
  error: string | null
}> {
  const token = process.env.QSTASH_TOKEN?.trim()
  if (!token) {
    return { configured: false, pingOk: false, latencyMs: null, error: 'QSTASH_TOKEN absent' }
  }

  const started = Date.now()
  try {
    const res = await fetch('https://qstash.upstash.io/v2/schedules', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    const latencyMs = Date.now() - started
    if (!res.ok) {
      return {
        configured: true,
        pingOk: false,
        latencyMs,
        error: `HTTP ${res.status}`,
      }
    }
    return { configured: true, pingOk: true, latencyMs, error: null }
  } catch (err: unknown) {
    return {
      configured: true,
      pingOk: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message.slice(0, 120) : 'Ping échoué',
    }
  }
}

async function checkStripe(): Promise<ServiceHealth> {
  const configured = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  if (!configured) {
    return {
      name: 'Stripe',
      status: 'unconfigured',
      configured: false,
      latencyMs: null,
      detail: 'STRIPE_SECRET_KEY absent',
    }
  }

  const started = Date.now()
  try {
    const { getStripe } = await import('@/lib/stripe')
    await getStripe().balance.retrieve()
    return {
      name: 'Stripe',
      status: 'ok',
      configured: true,
      latencyMs: Date.now() - started,
      detail: 'API accessible',
    }
  } catch (err: unknown) {
    return {
      name: 'Stripe',
      status: 'degraded',
      configured: true,
      latencyMs: Date.now() - started,
      detail: err instanceof Error ? err.message.slice(0, 120) : 'Erreur API',
    }
  }
}

async function checkResend(): Promise<ServiceHealth> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    return {
      name: 'Resend',
      status: 'unconfigured',
      configured: false,
      latencyMs: null,
      detail: 'RESEND_API_KEY absent',
    }
  }

  const started = Date.now()
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    })
    return {
      name: 'Resend',
      status: res.ok ? 'ok' : 'degraded',
      configured: true,
      latencyMs: Date.now() - started,
      detail: res.ok ? 'API accessible' : `HTTP ${res.status}`,
    }
  } catch (err: unknown) {
    return {
      name: 'Resend',
      status: 'degraded',
      configured: true,
      latencyMs: Date.now() - started,
      detail: err instanceof Error ? err.message.slice(0, 120) : 'Ping échoué',
    }
  }
}

async function checkPolygon(): Promise<ServiceHealth> {
  if (!isPolygonConfigured()) {
    return {
      name: 'Polygon',
      status: 'unconfigured',
      configured: false,
      latencyMs: null,
      detail: 'POLYGON_RPC_URL ou POLYGON_PRIVATE_KEY absent',
    }
  }

  const rpc = process.env.POLYGON_RPC_URL?.trim()
  if (!rpc) {
    return {
      name: 'Polygon',
      status: 'unconfigured',
      configured: false,
      latencyMs: null,
      detail: 'POLYGON_RPC_URL absent',
    }
  }

  const started = Date.now()
  try {
    const { ethers } = await import('ethers')
    const provider = new ethers.JsonRpcProvider(rpc)
    await provider.getBlockNumber()
    return {
      name: 'Polygon',
      status: 'ok',
      configured: true,
      latencyMs: Date.now() - started,
      detail: `Chain ${process.env.POLYGON_CHAIN_ID ?? '137'}`,
    }
  } catch (err: unknown) {
    return {
      name: 'Polygon',
      status: 'degraded',
      configured: true,
      latencyMs: Date.now() - started,
      detail: err instanceof Error ? err.message.slice(0, 120) : 'RPC indisponible',
    }
  }
}

function serviceFromDb(db: Awaited<ReturnType<typeof checkDatabase>>): ServiceHealth {
  return {
    name: 'PostgreSQL',
    status: db.connected ? 'ok' : db.error?.includes('absent') ? 'unconfigured' : 'down',
    configured: Boolean(process.env.DATABASE_URL?.trim()),
    latencyMs: db.latencyMs,
    detail: db.connected ? 'Connecté' : db.error,
  }
}

function serviceFromQStash(q: Awaited<ReturnType<typeof pingQStash>>): ServiceHealth {
  if (!q.configured) {
    return {
      name: 'QStash',
      status: 'unconfigured',
      configured: false,
      latencyMs: null,
      detail: q.error,
    }
  }
  return {
    name: 'QStash',
    status: q.pingOk ? 'ok' : 'degraded',
    configured: true,
    latencyMs: q.latencyMs,
    detail: q.pingOk ? 'Ping OK' : q.error,
  }
}

export async function getOpsHealth(): Promise<OpsHealthPayload> {
  const checkedAt = new Date().toISOString()
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null

  const [db, qstashPing, stripe, resend, polygon, ...cronRuns] = await Promise.all([
    checkDatabase(),
    pingQStash(),
    checkStripe(),
    checkResend(),
    checkPolygon(),
    ...CRON_DEFS.map((c) => getLastCronRun(c.action, c.resourceId)),
  ])

  const now = Date.now()
  const crons: CronHealth[] = CRON_DEFS.map((def, index) => {
    const last = cronRuns[index]
    const minutesSinceLastRun = last
      ? Math.round((now - last.getTime()) / 60_000)
      : null
    const stale =
      minutesSinceLastRun === null || minutesSinceLastRun > def.staleMinutes
    return {
      id: def.id,
      label: def.label,
      lastRunAt: last?.toISOString() ?? null,
      stale,
      staleThresholdMinutes: def.staleMinutes,
      minutesSinceLastRun,
    }
  })

  const alerts: string[] = []

  if (!db.connected) {
    alerts.push('Base de données indisponible')
  }
  if (qstashPing.configured && !qstashPing.pingOk) {
    alerts.push(`QStash injoignable${qstashPing.error ? ` (${qstashPing.error})` : ''}`)
  }

  for (const cron of crons) {
    if (!cron.stale) continue

    if (cron.id === 'fraud-surveillance' || cron.id === 'anomaly-detector') {
      if (
        (cron.minutesSinceLastRun ?? Infinity) > 10 ||
        cron.minutesSinceLastRun === null
      ) {
        alerts.push(
          cron.lastRunAt
            ? `${cron.label} inactif depuis ${cron.minutesSinceLastRun} min (seuil 10 min)`
            : `${cron.label} : aucune exécution enregistrée`,
        )
      }
    } else if (cron.id === 'subscription-monitor') {
      alerts.push(
        cron.lastRunAt
          ? `${cron.label} inactif depuis ${cron.minutesSinceLastRun} min`
          : `${cron.label} : aucune exécution enregistrée`,
      )
    }
  }

  const signingKeysConfigured = Boolean(
    process.env.QSTASH_CURRENT_SIGNING_KEY?.trim() &&
      process.env.QSTASH_NEXT_SIGNING_KEY?.trim(),
  )

  const qstashChainOk = !crons.some(
    (c) =>
      (c.id === 'fraud-surveillance' || c.id === 'anomaly-detector') &&
      ((c.minutesSinceLastRun ?? Infinity) > 10 || c.minutesSinceLastRun === null),
  )

  return {
    ok:
      db.connected &&
      qstashChainOk &&
      (!qstashPing.configured || qstashPing.pingOk),
    checkedAt,
    vercelGitCommitSha: sha,
    database: {
      connected: db.connected,
      latencyMs: db.latencyMs,
      error: db.error,
    },
    services: {
      database: serviceFromDb(db),
      qstash: serviceFromQStash(qstashPing),
      stripe,
      resend,
      polygon,
    },
    crons,
    qstash: {
      configured: qstashPing.configured,
      signingKeysConfigured,
      pingOk: qstashPing.pingOk,
      latencyMs: qstashPing.latencyMs,
      error: qstashPing.error,
    },
    alerts,
  }
}
