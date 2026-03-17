'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface QuickActionsProps {
  certificateId: string
  currentStatus: string
}

export default function QuickActions({ certificateId, currentStatus }: QuickActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')

  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const handleAction = async (action: string) => {
    // Pour revoke et reject, afficher un modal de confirmation
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

      // Recharger la page pour voir les changements
      router.refresh()
      setShowRevokeModal(false)
      setRevokeReason('')
      setPendingAction(null)
    } catch (err: any) {
      setError(err.message)
      alert(`Erreur: ${err.message}`)
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
    <div className="flex gap-2 items-center flex-wrap">
      {error && (
        <span className="text-red-400 text-xs">{error}</span>
      )}
      
      {currentStatus === 'PENDING' && (
        <>
          <button
            onClick={() => handleAction('activate')}
            disabled={loading}
            className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded text-sm font-medium hover:bg-green-500/30 transition disabled:opacity-50"
          >
            {loading ? '...' : '✅ Valider'}
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={loading}
            className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded text-sm font-medium hover:bg-red-500/30 transition disabled:opacity-50"
          >
            {loading ? '...' : '❌ Rejeter'}
          </button>
        </>
      )}

      {(currentStatus === 'ACTIVE' || currentStatus === 'ANCHORED') && (
        <>
          <button
            onClick={() => handleAction('suspend')}
            disabled={loading}
            className="bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded text-sm font-medium hover:bg-orange-500/30 transition disabled:opacity-50"
          >
            {loading ? '...' : '⏸️ Suspendre'}
          </button>
          <button
            onClick={() => handleAction('revoke')}
            disabled={loading}
            className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded text-sm font-medium hover:bg-red-500/30 transition disabled:opacity-50"
          >
            {loading ? '...' : '🚫 Révoquer'}
          </button>
        </>
      )}

      {currentStatus === 'SUSPENDED' && (
        <>
          <button
            onClick={() => handleAction('reactivate')}
            disabled={loading}
            className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded text-sm font-medium hover:bg-green-500/30 transition disabled:opacity-50"
          >
            {loading ? '...' : '▶️ Réactiver'}
          </button>
          <button
            onClick={() => handleAction('revoke')}
            disabled={loading}
            className="bg-red-500/20 text-red-400 px-3 py-1.5 rounded text-sm font-medium hover:bg-red-500/30 transition disabled:opacity-50"
          >
            {loading ? '...' : '🚫 Révoquer'}
          </button>
        </>
      )}

      {(currentStatus === 'REVOKED' || currentStatus === 'EXPIRED') && (
        <span className="text-gray-500 text-sm">Aucune action</span>
      )}

      {/* Modal de confirmation pour révocation/rejet */}
      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">⚠️ Confirmer l'action</h3>
            <p className="text-gray-400 text-base mb-4">
              Vous êtes sur le point de {currentStatus === 'PENDING' ? 'rejeter' : 'révoquer'} ce certificat.
              Cette action est <strong className="text-red-400">irréversible</strong>.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Raison (optionnel)
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Ex: Violation des conditions d'utilisation"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
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
                className="flex-1 bg-gray-700 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition text-base"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (pendingAction) {
                    executeAction(pendingAction, revokeReason || undefined)
                  }
                }}
                disabled={loading}
                className="flex-1 bg-red-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-red-600 transition disabled:opacity-50 text-base"
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
