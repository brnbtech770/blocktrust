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
import { Activity, Clock, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/format-relative-fr'

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
}

function pct(n: number) {
  return `${(n * 100).toFixed(2)} %`
}

export default function SurveillanceDashboard() {
  const [data, setData] = useState<SurveillancePayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [runLoading, setRunLoading] = useState(false)

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
        <button
          type="button"
          onClick={() => void runNow()}
          disabled={runLoading}
          className="shrink-0 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-semibold text-navy transition hover:brightness-110 disabled:opacity-50"
          style={{ background: 'var(--bt-cyan)', color: '#0a1628' }}
        >
          {runLoading ? 'Analyse en cours…' : 'Lancer maintenant'}
        </button>
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
