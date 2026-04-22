'use client'

// app/admin/alerts/AdminAlertsClient.tsx
// Liste interactive des alertes opérationnelles admin
// ============================================================

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { ShieldCheck } from 'lucide-react'

export type AdminAlertRow = {
  id: string
  type: string
  title: string
  description: string
  read: boolean
  createdAt: string
  entityId: string | null
  userId: string | null
  metadata: unknown
}

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'NEW_USER', label: 'Inscriptions' },
  { value: 'MANUAL_TRUST_REQUEST', label: 'Trust manuel' },
  { value: 'KYC_SUBMITTED', label: 'KYC' },
  { value: 'NEW_PAYMENT', label: 'Paiements' },
  { value: 'FRAUD_ALERT', label: 'Fraude' },
  { value: 'CERT_ACTIVATED', label: 'Cert. activés' },
  { value: 'CERT_REVOKED', label: 'Cert. révoqués' },
  { value: 'SUSPICIOUS_VOLUME', label: 'Volume' },
  { value: 'SUSPICIOUS_SCANNING', label: 'Scan' },
]

function iconForType(type: string): string {
  switch (type) {
    case 'NEW_USER':
      return '👤'
    case 'MANUAL_TRUST_REQUEST':
      return '🤝'
    case 'KYC_SUBMITTED':
      return '🪪'
    case 'NEW_PAYMENT':
      return '💳'
    case 'FRAUD_ALERT':
      return '🚨'
    case 'CERT_ACTIVATED':
      return '✅'
    case 'CERT_REVOKED':
      return '⛔'
    case 'SUSPICIOUS_VOLUME':
      return '📈'
    case 'SUSPICIOUS_SCANNING':
      return '🔭'
    default:
      return '🔔'
  }
}

function relativeTimeFr(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const sec = Math.round((d.getTime() - now) / 1000)
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  const abs = Math.abs(sec)
  if (abs < 60) return rtf.format(Math.round(sec / 1), 'second')
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour')
  if (abs < 604800) return rtf.format(Math.round(sec / 86400), 'day')
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AdminAlertsClient({
  initialAlerts,
  initialType,
}: {
  initialAlerts: AdminAlertRow[]
  initialType: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [banner, setBanner] = useState<string | null>(null)
  const [alerts, setAlerts] = useState(initialAlerts)

  const type = initialType

  const filtered = useMemo(() => {
    if (type === 'ALL') return alerts
    return alerts.filter((a) => a.type === type)
  }, [alerts, type])

  async function markRead(id: string) {
    const res = await fetch(`/api/admin/alerts/${id}/read`, { method: 'PATCH' })
    if (!res.ok) return
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
    startTransition(() => router.refresh())
  }

  async function markAllRead() {
    const res = await fetch('/api/admin/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    if (!res.ok) return
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
    setBanner('Toutes les alertes ont été marquées comme lues.')
    startTransition(() => router.refresh())
  }

  return (
    <div className="font-sans">
      {banner && (
        <div
          className="mb-4 rounded-lg border px-4 py-3 text-sm"
          style={{
            background: 'rgba(29,184,126,0.12)',
            borderColor: 'rgba(29,184,126,0.35)',
            color: '#1DB87E',
          }}
          role="status"
        >
          {banner}
        </div>
      )}

      <p className="mb-2 text-sm" style={{ color: 'var(--bt-muted)' }}>
        Alertes opérationnelles (inscriptions, KYC, abonnements, certificats, anomalies /verify).
      </p>
      <p className="mb-6 text-xs" style={{ color: 'var(--bt-muted)' }}>
        <Link href="/admin/ai-alerts" className="underline hover:text-white">
          Voir les alertes IA anti-fraude →
        </Link>
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map((t) => {
          const active = type === t.value
          const href = t.value === 'ALL' ? '/admin/alerts' : `/admin/alerts?type=${t.value}`
          return (
            <Link
              key={t.value}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                active ? 'font-semibold' : 'hover:bg-[rgba(255,255,255,0.04)]'
              }`}
              style={
                active
                  ? { background: 'rgba(0,212,255,0.12)', color: 'var(--bt-cyan)' }
                  : { color: 'var(--bt-muted)' }
              }
            >
              {t.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={markAllRead}
          disabled={pending || !alerts.some((a) => !a.read)}
          className="ml-auto rounded-lg px-4 py-2 text-sm transition disabled:opacity-40"
          style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--bt-muted)',
          }}
        >
          Tout marquer comme lu
        </button>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-xl border border-white/10 p-12 text-center"
          style={{ background: 'rgba(13,31,60,0.5)', borderColor: 'var(--bt-border)' }}
        >
          <ShieldCheck size={48} aria-hidden className="mx-auto mb-4 text-bt-cyan" />
          <h3 className="font-syne text-lg text-white/60">Aucune alerte active</h3>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => {
            const fraud = a.type === 'FRAUD_ALERT'
            const unread = !a.read
            return (
              <li
                key={a.id}
                className={`rounded-xl border border-white/10 p-5 transition ${
                  unread ? 'bg-white/5' : 'opacity-60'
                } ${fraud ? 'border-l-4 border-l-red-500' : ''}`}
                style={
                  fraud
                    ? undefined
                    : unread
                      ? { borderLeftWidth: 4, borderLeftColor: '#00d4ff' }
                      : undefined
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="text-2xl" aria-hidden>
                      {iconForType(a.type)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{a.title}</p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--bt-muted)' }}>
                        {a.description}
                      </p>
                      <p className="mt-2 text-xs" style={{ color: 'var(--bt-muted)' }}>
                        {relativeTimeFr(a.createdAt)} ·{' '}
                        <span style={{ fontFamily: 'var(--font-mono-bt), monospace' }}>
                          {a.type}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {unread && (
                      <button
                        type="button"
                        onClick={() => markRead(a.id)}
                        disabled={pending}
                        className="rounded-lg px-3 py-2 text-sm transition hover:opacity-90 disabled:opacity-40"
                        style={{
                          background: 'rgba(0,212,255,0.12)',
                          color: 'var(--bt-cyan)',
                        }}
                      >
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
