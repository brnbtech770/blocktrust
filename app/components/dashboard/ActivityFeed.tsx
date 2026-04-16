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
      return <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full" style={{ background: '#00d4ff' }} aria-hidden />
    case 'FRAUD_ALERT':
    case 'SUSPICIOUS_SCANNING':
      return <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full" style={{ background: '#E05252' }} aria-hidden />
    case 'SUSPICIOUS_VOLUME':
      return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
    default:
      return <XCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--bt-danger)' }} aria-hidden />
  }
}

function resultLabel(result: VerificationEvent['result']) {
  const labels: Record<VerificationEvent['result'], string> = {
    VALID: 'Valide',
    FRAUD_ALERT: 'Alerte fraude',
    EXPIRED: 'Expiré',
    REVOKED: 'Révoqué',
    NOT_FOUND: 'Non trouvé',
    RATE_LIMITED: 'Limite atteinte',
    QR_EXPIRED: 'QR expiré',
    SUSPICIOUS_VOLUME: 'Volume suspect',
    SUSPICIOUS_SCANNING: 'Scan suspect',
  }
  return labels[result] ?? result
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
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:border-gold/30">
      <div className="border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: 'var(--bt-border)' }}>
        <h2 className="font-syne text-lg font-bold tracking-tight text-white">
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
                  <span
                    style={{
                      color:
                        ev.result === 'VALID'
                          ? '#1DB87E'
                          : ev.result === 'SUSPICIOUS_VOLUME'
                            ? 'var(--bt-warn)'
                            : 'var(--bt-warn)',
                    }}
                  >
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
