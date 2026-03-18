'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CertificateActionsProps {
  certificateId: string
  currentStatus: string
}

export default function CertificateActions({ certificateId, currentStatus }: CertificateActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAction = async (action: string) => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/admin/certificates/${certificateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la mise à jour')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const btn = (onClick: () => void, label: string, variant: 'success' | 'danger' | 'warn') => (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 rounded-lg transition disabled:opacity-50"
      style={
        variant === 'success'
          ? { background: 'rgba(29,184,126,0.15)', color: '#1DB87E' }
          : variant === 'danger'
            ? { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)' }
            : { background: 'rgba(232,148,58,0.15)', color: 'var(--bt-warn)' }
      }
    >
      {loading ? '...' : label}
    </button>
  )

  return (
    <div>
      {error && (
        <div className="p-4 rounded-lg mb-4 border" style={{ background: 'rgba(224,82,82,0.1)', borderColor: 'var(--bt-danger)', color: 'var(--bt-danger)' }}>
          ❌ {error}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
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
          <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>Aucune action disponible</p>
        )}
      </div>
    </div>
  )
}
