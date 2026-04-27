'use client'

import { useState } from 'react'

type BlockchainStatus = 'PENDING' | 'ANCHORED' | 'FAILED' | null

export default function BlockchainCell({
  status,
  explorerUrl,
  blockNumber,
  certificateId,
}: {
  status: BlockchainStatus
  explorerUrl: string | null | undefined
  blockNumber: number | null | undefined
  certificateId: string
}) {
  const [loading, setLoading] = useState(false)
  const [localStatus, setLocalStatus] = useState<BlockchainStatus>(status)
  const [error, setError] = useState<string | null>(null)

  async function retry() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/admin/certificates/${certificateId}/anchor-retry`, {
        method: 'POST',
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        setError(body?.error || 'Retry échoué')
        return
      }
      setLocalStatus('PENDING')
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  if (localStatus === 'ANCHORED') {
    return (
      <div className="flex flex-col gap-1">
        <span
          className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--bt-cyan)' }}
        >
          Ancré ✓
        </span>
        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] hover:underline"
            style={{ color: 'var(--bt-cyan)' }}
            title={blockNumber ? `Bloc #${blockNumber}` : undefined}
          >
            Voir TX →
          </a>
        )}
      </div>
    )
  }

  if (localStatus === 'FAILED') {
    return (
      <div className="flex flex-col gap-1">
        <span
          className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
        >
          Échec
        </span>
        <button
          type="button"
          onClick={retry}
          disabled={loading}
          className="inline-flex w-fit items-center rounded-md border border-red-400/40 px-2 py-0.5 text-[11px] font-medium text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
        >
          {loading ? '…' : 'Réessayer'}
        </button>
        {error && <span className="text-[10px] text-red-300">{error}</span>}
      </div>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}
    >
      En attente
    </span>
  )
}
