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
      return <CheckCircle className="w-4 h-4 text-[var(--bt-success)] shrink-0" />
    case 'FRAUD_ALERT':
      return <AlertTriangle className="w-4 h-4 text-[var(--bt-warn)] shrink-0" />
    default:
      return <XCircle className="w-4 h-4 text-[var(--bt-danger)] shrink-0" />
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
    <div className="rounded-xl border border-gray-700 bg-[var(--bt-navy)]/60 backdrop-blur-sm overflow-hidden">
      <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
          Activité récente
        </h2>
        {loading && (
          <span className="text-xs text-gray-500">Actualisation...</span>
        )}
      </div>
      <ul className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
        {events.length === 0 && !loading ? (
          <li className="px-4 py-8 text-center text-gray-500 text-sm">
            Aucune vérification récente
          </li>
        ) : (
          events.map((ev) => (
            <li key={ev.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
              {resultIcon(ev.result)}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-300">
                  Certificat <span className="font-mono text-[var(--bt-gold)]">{ev.certificatePublicId ?? ev.certificateId}</span>
                  {' · '}
                  <span className={ev.result === 'VALID' ? 'text-[var(--bt-success)]' : 'text-[var(--bt-warn)]'}>
                    {resultLabel(ev.result)}
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
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
