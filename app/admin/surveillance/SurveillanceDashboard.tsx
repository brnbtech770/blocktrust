'use client'

// app/admin/surveillance/SurveillanceDashboard.tsx
// KPIs temps réel + graphique + lancement manuel de l’agent
// ============================================================

import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, Bot, Clock, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/format-relative-fr'

type AgentKey = 'fraud' | 'security' | 'subscription' | 'onboarding'

type SurveillancePayload = {
  verifications24h: number
  fraudRate: number
  fraudCount: number
  unreadAlerts: number
  lastRunAt: string | null
  chart: { hour: string; count: number }[]
  polygon?: {
    anchored: number
    pending: number
    failed: number
  }
  recentFraudAlerts: {
    id: string
    type: string
    title: string
    description: string
    read: boolean
    createdAt: string
  }[]
  agents?: {
    fraud: { active: boolean; lastRunAt: string | null; alertsGenerated: number }
    security: { active: boolean; lastRunAt: string | null; alertsGenerated: number }
    subscription: { active: boolean; lastRunAt: string | null; mrrEur: number }
    onboarding: { active: boolean; lastRunAt: string | null; remindersSent: number }
  }
  agentExecutionLogs?: {
    id: string
    action: string
    resourceId: string | null
    createdAt: string
    meta: unknown
  }[]
}

const AGENT_RUN_LABELS: Record<string, string> = {
  FRAUD_SURVEILLANCE_RUN: 'Fraude',
  SECURITY_MONITOR_RUN: 'Sécurité',
  SUBSCRIPTION_MONITOR_RUN: 'Abonnements',
  ONBOARDING_MONITOR_RUN: 'Onboarding',
}

const AGENT_KEYS: { key: AgentKey; label: string }[] = [
  { key: 'fraud', label: 'Fraude' },
  { key: 'security', label: 'Sécurité' },
  { key: 'subscription', label: 'Abonnements' },
  { key: 'onboarding', label: 'Onboarding' },
]

function pct(n: number) {
  return `${(n * 100).toFixed(2)} %`
}

export default function SurveillanceDashboard() {
  const [data, setData] = useState<SurveillancePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [runLoading, setRunLoading] = useState(false)
  const [restartLoading, setRestartLoading] = useState(false)
  const [agentRunLoading, setAgentRunLoading] = useState<AgentKey | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/surveillance', { cache: 'no-store' })
      if (!r.ok) {
        setError('Impossible de charger les indicateurs')
        return
      }
      setError(null)
      setData(await r.json())
    } catch {
      setError('Erreur réseau')
    }
  }, [])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 30_000)
    return () => window.clearInterval(id)
  }, [load])

  async function runNow() {
    setRunLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/run-surveillance', { method: 'POST' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setError(typeof j.error === 'string' ? j.error : "L'analyse n'a pas pu s'exécuter")
        return
      }
      await load()
    } catch {
      setError('Erreur réseau')
    } finally {
      setRunLoading(false)
    }
  }

  async function restartSurveillance() {
    setRestartLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/restart-surveillance', { method: 'POST' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setError(typeof j.error === 'string' ? j.error : 'Relance QStash impossible')
        return
      }
      await load()
    } catch {
      setError('Erreur réseau')
    } finally {
      setRestartLoading(false)
    }
  }

  async function runAgent(agent: AgentKey) {
    setAgentRunLoading(agent)
    setError(null)
    try {
      const r = await fetch(`/api/admin/run-agent?agent=${agent}`, { method: 'POST' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        setError(typeof j.error === 'string' ? j.error : "L'agent n'a pas pu s'exécuter")
        return
      }
      await load()
    } catch {
      setError('Erreur réseau')
    } finally {
      setAgentRunLoading(null)
    }
  }

  const lastRunLabel =
    data?.lastRunAt != null ? formatDistanceToNow(data.lastRunAt) : 'Jamais lancée'

  return (
    <div className="font-sans">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-syne text-2xl font-bold tracking-tight text-white">
            Surveillance IA — Détection d&apos;anomalies
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--bt-muted)' }}>
            Surveillance temps réel à chaque scan · Analyse globale via QStash toutes les 5 min ·
            Analyse manuelle disponible ci-dessous.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-white/40 text-xs">
            <Clock className="w-3 h-3 shrink-0" aria-hidden />
            <span>Dernière analyse : {lastRunLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void restartSurveillance()}
            disabled={restartLoading || runLoading}
            className="whitespace-nowrap rounded-lg border border-bt-cyan/40 px-5 py-2.5 text-sm font-semibold text-bt-cyan transition hover:bg-bt-cyan/10 disabled:opacity-50"
          >
            {restartLoading ? 'Relance…' : 'Relancer la surveillance'}
          </button>
          <button
            type="button"
            onClick={() => void runNow()}
            disabled={runLoading || restartLoading}
            className="whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold text-navy transition hover:brightness-110 disabled:opacity-50"
            style={{ background: 'var(--bt-cyan)', color: '#0a1628' }}
          >
            {runLoading ? 'Analyse en cours…' : 'Lancer maintenant'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm" style={{ color: 'var(--bt-danger, #e05252)' }}>
          {error}
        </p>
      )}

      <div
        className="mb-8 rounded-xl border border-white/10 p-5"
        style={{ background: 'rgba(13,31,60,0.5)' }}
      >
        <h2 className="mb-4 font-syne text-sm font-semibold uppercase tracking-wider text-white/60">
          Agents actifs
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {AGENT_KEYS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => void runAgent(key)}
              disabled={agentRunLoading !== null}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-bt-cyan/40 hover:text-bt-cyan disabled:opacity-50"
            >
              {agentRunLoading === key ? `Exécution ${label}…` : `Exécuter ${label}`}
            </button>
          ))}
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          <AgentStatusRow
            label="Agent Fraude"
            active={data?.agents?.fraud.active ?? true}
            detail={
              data?.agents?.fraud.lastRunAt
                ? `Dernière exécution : ${new Date(data.agents.fraud.lastRunAt).toLocaleString('fr-FR')}`
                : 'En attente de première exécution'
            }
            metric={
              data?.agents
                ? `${data.agents.fraud.alertsGenerated} alerte(s) dernière exécution`
                : undefined
            }
          />
          <AgentStatusRow
            label="Agent Sécurité"
            active={data?.agents?.security.active ?? true}
            detail={
              data?.agents?.security.lastRunAt
                ? `Dernière exécution : ${new Date(data.agents.security.lastRunAt).toLocaleString('fr-FR')}`
                : 'En attente de première exécution'
            }
            metric={
              data?.agents
                ? `${data.agents.security.alertsGenerated} alerte(s) générées (24h)`
                : undefined
            }
          />
          <AgentStatusRow
            label="Agent Abonnements"
            active={data?.agents?.subscription.active ?? true}
            detail={
              data?.agents?.subscription.lastRunAt
                ? `Dernière exécution : ${new Date(data.agents.subscription.lastRunAt).toLocaleString('fr-FR')}`
                : 'En attente de première exécution'
            }
            metric={
              data?.agents
                ? `MRR : ${data.agents.subscription.mrrEur.toFixed(2)}€`
                : undefined
            }
          />
          <AgentStatusRow
            label="Agent Onboarding"
            active={data?.agents?.onboarding.active ?? true}
            detail={
              data?.agents?.onboarding.lastRunAt
                ? `Dernière exécution : ${new Date(data.agents.onboarding.lastRunAt).toLocaleString('fr-FR')}`
                : 'En attente de première exécution'
            }
            metric={
              data?.agents
                ? `${data.agents.onboarding.remindersSent} rappel(s) dernière exécution`
                : undefined
            }
          />
        </ul>
      </div>

      <div
        className="mb-8 rounded-xl border border-white/10 p-5"
        style={{ background: 'rgba(13,31,60,0.5)' }}
      >
        <h2 className="mb-4 font-syne text-sm font-semibold uppercase tracking-wider text-white/60">
          Dernières exécutions agents
        </h2>
        {!data ? (
          <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
            Chargement…
          </p>
        ) : !data.agentExecutionLogs?.length ? (
          <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
            Aucune exécution enregistrée — relancez la surveillance QStash.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.agentExecutionLogs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">
                    {AGENT_RUN_LABELS[log.action] ?? log.action}
                  </span>
                  {log.resourceId ? (
                    <span className="font-mono text-xs text-white/35">{log.resourceId}</span>
                  ) : null}
                </div>
                <span className="text-xs" style={{ color: 'var(--bt-muted)' }}>
                  {new Date(log.createdAt).toLocaleString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="mb-8 rounded-xl border border-white/10 p-5"
        style={{ background: 'rgba(13,31,60,0.5)' }}
      >
        <h2 className="mb-4 font-syne text-sm font-semibold uppercase tracking-wider text-white/60">
          Règles de détection
        </h2>
        <ul className="space-y-4">
          <li className="flex gap-3">
            <Activity className="mt-0.5 h-5 w-5 shrink-0 text-bt-cyan" aria-hidden />
            <div>
              <p className="font-medium text-white">Volume anormal de vérifications</p>
              <p className="mt-1 text-sm text-white/45">
                Détecte &gt; 50 scans/heure sur un même certificat
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#f59e0b]" aria-hidden />
            <div>
              <p className="font-medium text-white">Taux de fraude élevé</p>
              <p className="mt-1 text-sm text-white/45">
                Détecte &gt; 10 % de FRAUD_ALERT sur 24 h
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#BDA76B]" aria-hidden />
            <div>
              <p className="font-medium text-white">Certificat révoqué scanné</p>
              <p className="mt-1 text-sm text-white/45">
                Détecte les scans sur des certificats révoqués
              </p>
            </div>
          </li>
        </ul>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Vérifications (24h)" value={data ? String(data.verifications24h) : '—'} />
        <KpiCard label="Taux de fraude" value={data ? pct(data.fraudRate) : '—'} />
        <KpiCard label="Alertes admin non lues" value={data ? String(data.unreadAlerts) : '—'} />
        <KpiCard
          label="Incidents fraude (24h)"
          value={data ? String(data.fraudCount) : '—'}
          tone="red"
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 font-syne text-base font-semibold text-white">Ancrages Polygon</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Ancrés on-chain"
            value={data?.polygon ? String(data.polygon.anchored) : '—'}
            tone="cyan"
          />
          <KpiCard
            label="En attente"
            value={data?.polygon ? String(data.polygon.pending) : '—'}
            tone="amber"
          />
          <KpiCard
            label="Échecs"
            value={data?.polygon ? String(data.polygon.failed) : '—'}
            tone="red"
          />
        </div>
      </div>

      <div
        className="mb-10 rounded-xl border p-6"
        style={{ background: 'rgba(13,31,60,0.5)', borderColor: 'var(--bt-border)' }}
      >
        <h2 className="mb-4 font-syne text-lg font-semibold text-white">
          Vérifications par heure (24h)
        </h2>
        <div className="h-72 w-full min-w-0">
          {data && data.chart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: 'var(--bt-muted)', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: 'var(--bt-muted)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#0a1628',
                    border: '1px solid var(--bt-border)',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: 'var(--bt-muted)' }}
                />
                <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} name="Vérifications" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
              Aucune donnée sur la période.
            </p>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{ background: 'rgba(13,31,60,0.5)', borderColor: 'var(--bt-border)' }}
      >
        <h2 className="mb-4 font-syne text-lg font-semibold text-white">
          10 dernières alertes fraude / anomalies
        </h2>
        {!data ? (
          <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
            Chargement…
          </p>
        ) : data.recentFraudAlerts.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
            Aucune alerte récente de ce type.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.recentFraudAlerts.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                style={{ opacity: a.read ? 0.65 : 1 }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono" style={{ color: 'var(--bt-cyan)' }}>
                    {a.type}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--bt-muted)' }}>
                    {new Date(a.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                <p className="mt-1 font-medium text-white">{a.title}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--bt-muted)' }}>
                  {a.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function AgentStatusRow({
  label,
  active,
  detail,
  metric,
}: {
  label: string
  active: boolean
  detail: string
  metric?: string
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <Bot
        className={`mt-0.5 h-5 w-5 shrink-0 ${active ? 'text-emerald-400' : 'text-white/30'}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-medium text-white">
          {label} : {active ? '✅ Actif' : 'Inactif'}
        </p>
        <p className="mt-1 text-sm text-white/45">{detail}</p>
        {metric ? <p className="mt-1 text-xs text-bt-cyan">{metric}</p> : null}
      </div>
    </li>
  )
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'cyan' | 'amber' | 'red'
}) {
  const valueColor =
    tone === 'cyan'
      ? 'var(--bt-cyan)'
      : tone === 'amber'
        ? '#fbbf24'
        : tone === 'red'
          ? '#f87171'
          : 'white'
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: 'rgba(13,31,60,0.5)', borderColor: 'var(--bt-border)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--bt-muted)' }}>
        {label}
      </p>
      <p className="mt-2 font-syne text-2xl font-bold" style={{ color: valueColor }}>
        {value}
      </p>
    </div>
  )
}
