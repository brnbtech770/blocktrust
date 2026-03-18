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

  const btn = (onClick: () => void, label: string, variant: 'success' | 'danger' | 'warn') => {
    const styles = {
      success: { background: 'rgba(29,184,126,0.15)', color: '#1DB87E' },
      danger: { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)' },
      warn: { background: 'rgba(232,148,58,0.15)', color: 'var(--bt-warn)' },
    }
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className="px-3 py-1.5 rounded text-sm font-medium transition disabled:opacity-50"
        style={styles[variant]}
      >
        {loading ? '...' : label}
      </button>
    )
  }

  return (
    <div className="flex gap-2 items-center flex-wrap">
      {error && (
        <span className="text-xs" style={{ color: 'var(--bt-danger)' }}>{error}</span>
      )}

      {currentStatus === 'PENDING' && (
        <>
          {btn(() => handleAction('activate'), '✅ Valider', 'success')}
          {btn(() => handleAction('reject'), '❌ Rejeter', 'danger')}
        </>
      )}

      {(currentStatus === 'ACTIVE' || currentStatus === 'ANCHORED') && (
        <>
          {btn(() => handleAction('suspend'), '⏸️ Suspendre', 'warn')}
          {btn(() => handleAction('revoke'), '🚫 Révoquer', 'danger')}
        </>
      )}

      {currentStatus === 'SUSPENDED' && (
        <>
          {btn(() => handleAction('reactivate'), '▶️ Réactiver', 'success')}
          {btn(() => handleAction('revoke'), '🚫 Révoquer', 'danger')}
        </>
      )}

      {(currentStatus === 'REVOKED' || currentStatus === 'EXPIRED') && (
        <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>Aucune action</span>
      )}

      {showRevokeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rounded-2xl border p-6 max-w-md w-full mx-4" style={{ background: 'rgba(13,31,60,0.95)', borderColor: 'var(--bt-border)' }}>
            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>⚠️ Confirmer l'action</h3>
            <p className="text-base mb-4" style={{ color: 'var(--bt-muted)' }}>
              Vous êtes sur le point de {currentStatus === 'PENDING' ? 'rejeter' : 'révoquer'} ce certificat.
              Cette action est <strong style={{ color: 'var(--bt-danger)' }}>irréversible</strong>.
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
                onClick={() => { setShowRevokeModal(false); setRevokeReason(''); setPendingAction(null) }}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition border"
                style={{ borderColor: 'var(--bt-border)', color: 'white', background: 'transparent' }}
              >
                Annuler
              </button>
              <button
                onClick={() => pendingAction && executeAction(pendingAction, revokeReason || undefined)}
                disabled={loading}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition disabled:opacity-50"
                style={{ background: 'var(--bt-danger)', color: 'white' }}
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
