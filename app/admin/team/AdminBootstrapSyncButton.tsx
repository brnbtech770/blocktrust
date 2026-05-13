'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function AdminBootstrapSyncButton() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSync() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/bootstrap', { method: 'POST', credentials: 'include' })
      const j = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setMessage(j.error ?? 'Échec')
        return
      }
      setMessage('Capacités admin synchronisées.')
    } catch {
      setMessage('Erreur réseau')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1f3c] p-5">
      <p className="mb-1 text-sm font-semibold text-white/80">Synchronisation technique</p>
      <p className="mb-4 text-xs text-white/40">
        Force le plan Enterprise en base, TrustScore 100 et relations Trust Circle MUTUAL entre tous les comptes
        listés dans ADMIN_EMAILS (déjà inscrits).
      </p>
      <button
        type="button"
        onClick={() => void onSync()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/15 px-4 py-2 text-sm font-medium text-[#00d4ff] transition hover:bg-[#00d4ff]/25 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 shrink-0 ${busy ? 'animate-spin' : ''}`} aria-hidden />
        {busy ? 'Synchronisation…' : 'Synchroniser capacités admin'}
      </button>
      {message ? <p className="mt-3 text-xs text-white/55">{message}</p> : null}
    </div>
  )
}
