// app/components/dashboard/ActivityFeed.tsx
// Fil d’activité (vérifications) avec polling toutes les 30s via /api/activity
// ============================================================

'use client'

import { useEffect, useState } from 'react'
import type { VerificationEvent } from '@/types/dashboard'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export interface ActivityFeedProps {
  initialEvents?: VerificationEvent[]
}

const POLL_INTERVAL_MS = 30_000

function resultIcon(result: VerificationEvent['result']) {
  switch (result) {
    case 'VALID':
      return <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ background: '#00d4ff' }} aria-hidden />
    case 'FRAUD_ALERT':
      return <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ background: '#E05252' }} aria-hidden />
    default:
      return <XCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--bt-danger)' }} />
  }
}

function resultLabel(result: VerificationEvent['result']) {
  const labels: Record<VerificationEvent['result'], string> = {
    VALID: 'Valide',
    FRAUD_ALERT: 'Alerte fraude',
    EXPIRED: 'Expiré',
    REVOKED: 'Révoqué',
    NOT_FOUND: 'Non trouvé',
  }
  return labels[result]
}

export default function ActivityFeed({ initialEvents = [] }: ActivityFeedProps) {
  const [events, setEvents] = useState<VerificationEvent[]>(initialEvents)
  const [loading, setLoading] = useState(false)

  const fetchActivity = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/activity?limit=10', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setEvents(Array.isArray(data) ? data : [])
      }
    } catch {
      // keep previous events on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialEvents.length > 0) setEvents(initialEvents)
  }, [initialEvents.length])

  useEffect(() => {
    fetchActivity()
    const t = setInterval(fetchActivity, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--bt-border)', background: 'rgba(13,31,60,0.5)' }}>
      <div className="border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: 'var(--bt-border)' }}>
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
          Activité récente
        </h2>
        {loading && (
          <span className="text-[10px]" style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}>Actualisation...</span>
        )}
      </div>
      <ul className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: 'var(--bt-border)' }}>
        {events.length === 0 && !loading ? (
          <li className="px-4 py-8 text-center text-sm" style={{ color: 'var(--bt-muted)' }}>
            Aucune vérification récente
          </li>
        ) : (
          events.map((ev) => (
            <li key={ev.id} className="px-4 py-3 flex items-start gap-3 hover:bg-[rgba(0,212,255,0.04)] transition-colors">
              {resultIcon(ev.result)}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">
                  Certificat <span className="font-mono" style={{ color: 'var(--bt-cyan)' }}>{ev.certificatePublicId ?? ev.certificateId}</span>
                  {' · '}
                  <span style={{ color: ev.result === 'VALID' ? '#1DB87E' : 'var(--bt-warn)' }}>
                    {resultLabel(ev.result)}
                  </span>
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}>
                  {new Date(ev.verifiedAt).toLocaleString('fr-FR')}
                  {ev.country ? ` · ${ev.country}` : ''}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
