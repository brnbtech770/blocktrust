'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionButton, { NoActionText } from './ActionButton'

interface QuickActionsProps {
  certificateId: string
  currentStatus: string
  blockchainStatus?: string | null
}

export default function QuickActions({ certificateId, currentStatus, blockchainStatus }: QuickActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [anchorLoading, setAnchorLoading] = useState(false)

  async function manualAnchor() {
    setAnchorLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/certificates/${certificateId}/anchor-retry`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Ancrage échoué')
      }
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur ancrage'
      setError(message)
    } finally {
      setAnchorLoading(false)
    }
  }

  const canManualAnchor =
    (currentStatus === 'ACTIVE' || currentStatus === 'ANCHORED') &&
    blockchainStatus !== 'ANCHORED'

  const handleAction = async (action: string) => {
    if (action === 'revoke' || action === 'reject') {
      setPendingAction(action)
      setShowRevokeModal(true)
      return
    }

    if (!confirm(`Êtes-vous sûr de vouloir ${getActionLabel(action)} ce certificat ?`)) {
      return
    }

    await executeAction(action)
  }

  const executeAction = async (action: string, reason?: string) => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/admin/certificates/${certificateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la mise à jour')
      }

      router.refresh()
      setShowRevokeModal(false)
      setRevokeReason('')
      setPendingAction(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      alert(`Erreur: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      activate: 'activer',
      reject: 'rejeter',
      suspend: 'suspendre',
      reactivate: 'réactiver',
      revoke: 'révoquer',
    }
    return labels[action] || action
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span className="text-xs text-red-400">{error}</span>
      )}

      {currentStatus === 'PENDING' && (
        <>
          <ActionButton variant="validate" onClick={() => handleAction('activate')} loading={loading} />
          <ActionButton variant="reject" onClick={() => handleAction('reject')} loading={loading} />
        </>
      )}

      {(currentStatus === 'ACTIVE' || currentStatus === 'ANCHORED') && (
        <>
          {canManualAnchor && (
            <button
              type="button"
              onClick={manualAnchor}
              disabled={anchorLoading || loading}
              className="inline-flex items-center rounded border border-bt-cyan/30 bg-bt-cyan/10 px-2 py-1 text-xs text-bt-cyan transition hover:bg-bt-cyan/20 disabled:opacity-50"
            >
              {anchorLoading ? '…' : 'Ancrer manuellement'}
            </button>
          )}
          <ActionButton variant="suspend" onClick={() => handleAction('suspend')} loading={loading} />
          <ActionButton variant="revoke" onClick={() => handleAction('revoke')} loading={loading} />
        </>
      )}

      {currentStatus === 'SUSPENDED' && (
        <>
          <ActionButton variant="reactivate" onClick={() => handleAction('reactivate')} loading={loading} />
          <ActionButton variant="revoke" onClick={() => handleAction('revoke')} loading={loading} />
        </>
      )}

      {(currentStatus === 'REVOKED' || currentStatus === 'EXPIRED') && <NoActionText />}

      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div
            className="rounded-2xl border p-6 max-w-md w-full mx-4"
            style={{ background: 'rgba(13,31,60,0.95)', borderColor: 'var(--bt-border)' }}
          >
            <h3 className="font-syne mb-4 text-2xl font-bold tracking-tight text-white">
              ⚠️ Confirmer l&apos;action
            </h3>
            <p className="text-base mb-4" style={{ color: 'var(--bt-muted)' }}>
              Vous êtes sur le point de {currentStatus === 'PENDING' ? 'rejeter' : 'révoquer'} ce certificat.
              Cette action est <strong className="text-red-400">irréversible</strong>.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--bt-muted)' }}>
                Raison (optionnel)
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Ex: Violation des conditions d'utilisation"
                className="w-full px-4 py-2 rounded-lg text-white placeholder-opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--bt-cyan)]"
                style={{ background: 'rgba(6,14,26,0.8)', border: '1px solid var(--bt-border)' }}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRevokeModal(false)
                  setRevokeReason('')
                  setPendingAction(null)
                }}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition border"
                style={{ borderColor: 'var(--bt-border)', color: 'white', background: 'transparent' }}
              >
                Annuler
              </button>
              <button
                onClick={() => pendingAction && executeAction(pendingAction, revokeReason || undefined)}
                disabled={loading}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition disabled:opacity-50 bg-red-500 text-white hover:bg-red-600"
              >
                {loading ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
