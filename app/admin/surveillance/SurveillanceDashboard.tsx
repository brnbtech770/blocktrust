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

type SurveillancePayload = {
  verifications24h: number
  fraudRate: number
  fraudCount: number
  unreadAlerts: number
  lastRunAt: string | null
  chart: { hour: string; count: number }[]
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
    try {
      const r = await fetch('/api/cron/anomaly-detection', { method: 'POST' })
      if (!r.ok) {
        setError("L'analyse n'a pas pu s'exécuter")
        return
      }
      await load()
    } finally {
      setRunLoading(false)
    }
  }

  return (
    <div className="font-sans">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-syne text-2xl font-bold tracking-tight text-white">
            Surveillance IA — Détection d&apos;anomalies
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--bt-muted)' }}>
            Agent TypeScript exécuté via Vercel Cron (toutes les 15 min) ou manuellement ci-dessous.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void runNow()}
          disabled={runLoading}
          className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: 'var(--bt-cyan)' }}
        >
          {runLoading ? 'Analyse…' : 'Lancer analyse maintenant'}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm" style={{ color: 'var(--bt-danger, #e05252)' }}>
          {error}
        </p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Vérifications (24h)"
          value={data ? String(data.verifications24h) : '—'}
        />
        <KpiCard label="Taux de fraude" value={data ? pct(data.fraudRate) : '—'} />
        <KpiCard
          label="Alertes admin non lues"
          value={data ? String(data.unreadAlerts) : '—'}
        />
        <KpiCard
          label="Dernière exécution agent"
          value={
            data?.lastRunAt
              ? new Date(data.lastRunAt).toLocaleString('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'medium',
                })
              : '—'
          }
        />
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

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: 'rgba(13,31,60,0.5)', borderColor: 'var(--bt-border)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--bt-muted)' }}>
        {label}
      </p>
      <p className="mt-2 font-syne text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
