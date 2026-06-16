'use client'

// app/admin/ai-alerts/AdminMergedAlertsClient.tsx
// Alertes IA + alertes opérationnelles admin (fusionnées)
// ============================================================

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { ShieldCheck, Search, CheckCircle, EyeOff, Bell } from 'lucide-react'

export type MergedAdminAlertRow = {
  id: string
  source: 'ADMIN'
  type: string
  title: string
  description: string
  read: boolean
  createdAt: string
  entityId: string | null
  userId: string | null
  entityName?: string | null
  certificateLabel?: string | null
  contactLabel?: string | null
}

export type MergedAiAlertRow = {
  id: string
  source: 'AI'
  alertType: string
  severity: string
  status: string
  title: string
  description: string
  details: unknown
  resolution: string | null
  resolvedAt: string | null
  createdAt: string
  entityName: string
  certificatePublicId: string | null
  certificateId: string | null
  certificateLabel?: string | null
  certificateFullCode?: string | null
}

export type MergedAlertTab = 'ALL' | 'FRAUD' | 'SUSPICIOUS' | 'SYSTEM' | 'KYC'

type UnifiedAlert =
  | (MergedAdminAlertRow & { tabCategory: MergedAlertTab | 'OTHER' })
  | (MergedAiAlertRow & { tabCategory: MergedAlertTab | 'OTHER' })

const TABS: { value: MergedAlertTab; label: string }[] = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'FRAUD', label: 'Fraude' },
  { value: 'SUSPICIOUS', label: 'Suspicious' },
  { value: 'SYSTEM', label: 'Système' },
  { value: 'KYC', label: 'KYC' },
]

const SUSPICIOUS_TYPES = new Set([
  'SUSPICIOUS_VOLUME',
  'SUSPICIOUS_SCANNING',
  'SUSPICIOUS_ACTIVITY',
  'UNUSUAL_PATTERN',
  'ANOMALY',
  'REVOKED_SCAN',
  'TRUST_CIRCLE_ANOMALY',
  'CERTIFICATE_ABUSE',
  'PHISHING_ATTEMPT',
  'IDENTITY_MISMATCH',
])

const SYSTEM_TYPES = new Set([
  'SYSTEM',
  'NEW_USER',
  'NEW_PAYMENT',
  'CERT_ACTIVATED',
  'CERT_REVOKED',
  'CERT_ANCHORED',
  'MANUAL_TRUST_REQUEST',
])

function categorizeAdminType(type: string): MergedAlertTab | 'OTHER' {
  if (type === 'FRAUD_ALERT') return 'FRAUD'
  if (type === 'KYC_SUBMITTED') return 'KYC'
  if (SUSPICIOUS_TYPES.has(type)) return 'SUSPICIOUS'
  if (SYSTEM_TYPES.has(type)) return 'SYSTEM'
  return 'OTHER'
}

function categorizeAiType(type: string): MergedAlertTab | 'OTHER' {
  if (type === 'FRAUD_ALERT') return 'FRAUD'
  if (SUSPICIOUS_TYPES.has(type)) return 'SUSPICIOUS'
  if (type === 'SYSTEM') return 'SYSTEM'
  return 'OTHER'
}

function aiAlertTypeLabel(type: string): string {
  const map: Record<string, string> = {
    FRAUD_ALERT: 'Tentative de fraude détectée',
    SUSPICIOUS_VOLUME: 'Volume suspect de vérifications',
    REVOKED_SCAN: 'Certificat révoqué scanné',
    ANOMALY: 'Anomalie détectée',
    SYSTEM: 'Alerte système',
    SUSPICIOUS_ACTIVITY: 'Activité suspecte',
    IDENTITY_MISMATCH: 'Incohérence d’identité',
    UNUSUAL_PATTERN: 'Schéma inhabituel',
    PHISHING_ATTEMPT: 'Tentative d’hameçonnage',
    CERTIFICATE_ABUSE: 'Abus de certificat',
    TRUST_CIRCLE_ANOMALY: 'Anomalie Trust Circle',
  }
  return map[type] ?? type.replace(/_/g, ' ')
}

function adminTypeLabel(type: string): string {
  const map: Record<string, string> = {
    NEW_USER: 'Nouvelle inscription',
    KYC_SUBMITTED: 'KYC soumis',
    NEW_PAYMENT: 'Nouveau paiement',
    FRAUD_ALERT: 'Alerte fraude',
    CERT_ACTIVATED: 'Certificat activé',
    CERT_REVOKED: 'Certificat révoqué',
    SUSPICIOUS_VOLUME: 'Volume suspect',
    SUSPICIOUS_SCANNING: 'Scan suspect',
    MANUAL_TRUST_REQUEST: 'Demande Trust manuelle',
    CERT_ANCHORED: 'Certificat ancré',
  }
  return map[type] ?? type.replace(/_/g, ' ')
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

function getSeverityStyle(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)', borderColor: 'rgba(224,82,82,0.3)' }
    case 'HIGH':
      return { background: 'rgba(232,148,58,0.15)', color: 'var(--bt-warn)', borderColor: 'rgba(232,148,58,0.3)' }
    case 'MEDIUM':
      return { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)', borderColor: 'rgba(189,167,107,0.3)' }
    case 'LOW':
      return { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)', borderColor: 'rgba(0,212,255,0.3)' }
    default:
      return { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)', borderColor: 'var(--bt-border)' }
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'PENDING':
      return { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }
    case 'INVESTIGATING':
      return { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)' }
    case 'RESOLVED':
      return { background: 'rgba(29,184,126,0.15)', color: '#1DB87E' }
    case 'DISMISSED':
      return { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }
    case 'ESCALATED':
      return { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)' }
    default:
      return { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'En attente'
    case 'INVESTIGATING':
      return 'Investigation'
    case 'RESOLVED':
      return 'Résolu'
    case 'DISMISSED':
      return 'Ignoré'
    case 'ESCALATED':
      return 'Escaladé'
    default:
      return status
  }
}

export default function AdminMergedAlertsClient({
  adminAlerts: initialAdmin,
  aiAlerts,
  initialTab,
}: {
  adminAlerts: MergedAdminAlertRow[]
  aiAlerts: MergedAiAlertRow[]
  initialTab: MergedAlertTab
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [banner, setBanner] = useState<string | null>(null)
  const [adminAlerts, setAdminAlerts] = useState(initialAdmin)
  const [aiAlertsState, setAiAlertsState] = useState(aiAlerts)
  const tab = initialTab

  const unified = useMemo((): UnifiedAlert[] => {
    const admin: UnifiedAlert[] = adminAlerts.map((a) => ({
      ...a,
      tabCategory: categorizeAdminType(a.type),
    }))
    const ai: UnifiedAlert[] = aiAlertsState.map((a) => ({
      ...a,
      tabCategory: categorizeAiType(a.alertType),
    }))
    return [...admin, ...ai].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [adminAlerts, aiAlertsState])

  const filtered = useMemo(() => {
    if (tab === 'ALL') return unified
    return unified.filter((a) => a.tabCategory === tab)
  }, [unified, tab])

  async function markAdminRead(id: string) {
    const res = await fetch(`/api/admin/alerts/${id}/read`, { method: 'PATCH' })
    if (!res.ok) return
    setAdminAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
    startTransition(() => router.refresh())
  }

  async function markAllAdminRead() {
    const res = await fetch('/api/admin/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    if (!res.ok) return
    setAdminAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
    setBanner('Toutes les alertes opérationnelles ont été marquées comme lues.')
    startTransition(() => router.refresh())
  }

  async function updateAiAlertStatus(
    id: string,
    status: 'INVESTIGATING' | 'RESOLVED' | 'IGNORED'
  ) {
    const res = await fetch(`/api/admin/ai-alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      setBanner('Impossible de mettre à jour l’alerte.')
      return
    }
    const data = (await res.json()) as { status?: string }
    const nextStatus = data.status ?? (status === 'IGNORED' ? 'DISMISSED' : status)
    setAiAlertsState((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: nextStatus,
              resolvedAt:
                nextStatus === 'RESOLVED' || nextStatus === 'DISMISSED'
                  ? new Date().toISOString()
                  : null,
            }
          : a
      )
    )
    startTransition(() => router.refresh())
  }

  const tabHref = (t: MergedAlertTab) =>
    t === 'ALL' ? '/admin/ai-alerts' : `/admin/ai-alerts?tab=${t}`

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

      <p className="mb-6 text-sm" style={{ color: 'var(--bt-muted)' }}>
        Alertes anti-fraude IA et alertes opérationnelles (inscriptions, KYC, paiements, certificats).
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const active = tab === t.value
          const count =
            t.value === 'ALL'
              ? unified.length
              : unified.filter((a) => a.tabCategory === t.value).length
          return (
            <Link
              key={t.value}
              href={tabHref(t.value)}
              className={`rounded-lg px-4 py-2 text-sm transition ${
                active ? 'font-semibold' : 'hover:bg-[rgba(255,255,255,0.04)]'
              }`}
              style={
                active
                  ? { background: 'rgba(0,212,255,0.12)', color: 'var(--bt-cyan)' }
                  : { color: 'var(--bt-muted)' }
              }
            >
              {t.label} ({count})
            </Link>
          )
        })}
        <button
          type="button"
          onClick={markAllAdminRead}
          disabled={pending || !adminAlerts.some((a) => !a.read)}
          className="ml-auto rounded-lg px-4 py-2 text-sm transition disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }}
        >
          Tout marquer comme lu
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center transition-all hover:border-bt-cyan/30">
          <ShieldCheck size={48} aria-hidden className="mx-auto mb-4 text-bt-cyan" />
          <h3 className="font-syne text-lg text-white/60">Aucune alerte pour ce filtre</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((alert) => {
            if (alert.source === 'ADMIN') {
              const fraud = alert.type === 'FRAUD_ALERT'
              const unread = !alert.read
              return (
                <div
                  key={`admin-${alert.id}`}
                  className={`rounded-xl border border-white/10 p-5 transition ${
                    unread ? 'bg-white/5' : 'opacity-70'
                  } ${fraud ? 'border-l-4 border-l-red-500' : unread ? 'border-l-4 border-l-[#00d4ff]' : ''}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <Bell className="mt-0.5 h-5 w-5 shrink-0 text-bt-cyan/80" aria-hidden />
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }}
                          >
                            Opérationnelle
                          </span>
                          <span className="text-xs font-medium text-white/50">
                            {adminTypeLabel(alert.type)}
                          </span>
                        </div>
                        <p className="font-semibold text-white">{alert.title}</p>
                        {alert.contactLabel ? (
                          <p className="mt-1 text-sm font-medium text-bt-cyan/90">
                            {alert.contactLabel}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm" style={{ color: 'var(--bt-muted)' }}>
                          {alert.description}
                        </p>
                        <p className="mt-2 text-xs" style={{ color: 'var(--bt-muted)' }}>
                          {relativeTimeFr(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                    {unread && (
                      <button
                        type="button"
                        onClick={() => markAdminRead(alert.id)}
                        disabled={pending}
                        className="shrink-0 rounded-lg px-3 py-2 text-sm transition hover:opacity-90 disabled:opacity-40"
                        style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--bt-cyan)' }}
                      >
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              )
            }

            const ai = alert
            return (
              <div
                key={`ai-${ai.id}`}
                className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' }}
                      >
                        IA
                      </span>
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-bold"
                        style={getSeverityStyle(ai.severity)}
                      >
                        {ai.severity}
                      </span>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-bold"
                        style={getStatusStyle(ai.status)}
                      >
                        {statusLabel(ai.status)}
                      </span>
                      <span className="text-xs font-medium text-white/55">
                        {aiAlertTypeLabel(ai.alertType)}
                      </span>
                    </div>
                    <h3 className="font-syne mb-2 text-xl font-bold tracking-tight text-white">
                      {ai.title}
                    </h3>
                    <p className="mb-4 text-sm" style={{ color: 'var(--bt-muted)' }}>
                      {ai.description}
                    </p>
                  </div>
                  <span
                    className="text-xs"
                    style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}
                  >
                    {new Date(ai.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-sm" style={{ color: 'var(--bt-muted)' }}>
                      Entité
                    </p>
                    <p className="text-white">{ai.entityName}</p>
                  </div>
                  {ai.certificateId && (
                    <div>
                      <p className="mb-1 text-sm" style={{ color: 'var(--bt-muted)' }}>
                        Certificat
                      </p>
                      <Link
                        href={`/admin/certificates/${ai.certificateId}`}
                        className="text-sm hover:underline"
                        style={{ color: 'var(--bt-cyan)' }}
                        title={ai.certificateFullCode ?? ai.certificatePublicId ?? ai.certificateId ?? undefined}
                      >
                        {ai.certificateLabel ?? ai.certificatePublicId ?? ai.certificateId.slice(0, 8)} →
                      </Link>
                    </div>
                  )}
                </div>

                {ai.details != null && (
                  <div className="mb-4 rounded-lg p-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <p className="mb-2 text-sm" style={{ color: 'var(--bt-muted)' }}>
                      Détails
                    </p>
                    <pre
                      className="overflow-auto text-xs text-white"
                      style={{ fontFamily: 'var(--font-mono-bt), monospace' }}
                    >
                      {JSON.stringify(ai.details, null, 2)}
                    </pre>
                  </div>
                )}

                {ai.status === 'PENDING' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => updateAiAlertStatus(ai.id, 'INVESTIGATING')}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition disabled:opacity-40"
                      style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' }}
                    >
                      <Search className="h-4 w-4 shrink-0" aria-hidden />
                      Investiguer
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => updateAiAlertStatus(ai.id, 'RESOLVED')}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition disabled:opacity-40"
                      style={{ background: 'rgba(29,184,126,0.15)', color: '#1DB87E' }}
                    >
                      <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                      Résoudre
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => updateAiAlertStatus(ai.id, 'IGNORED')}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition disabled:opacity-40"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }}
                    >
                      <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
                      Ignorer
                    </button>
                  </div>
                )}
                {ai.status === 'INVESTIGATING' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => updateAiAlertStatus(ai.id, 'RESOLVED')}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition disabled:opacity-40"
                      style={{ background: 'rgba(29,184,126,0.15)', color: '#1DB87E' }}
                    >
                      <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                      Résoudre
                    </button>
                  </div>
                )}
                {(ai.status === 'RESOLVED' || ai.status === 'DISMISSED') && (
                  <p className="text-sm font-medium" style={{ color: getStatusStyle(ai.status).color }}>
                    {ai.status === 'RESOLVED' ? 'Résolu' : 'Ignoré'}
                    {ai.resolvedAt
                      ? ` · ${relativeTimeFr(ai.resolvedAt)}`
                      : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
