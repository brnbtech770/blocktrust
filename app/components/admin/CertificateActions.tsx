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

  return (
    <div>
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-lg mb-4">
          ❌ {error}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {currentStatus === 'PENDING' && (
          <>
            <button
              onClick={() => handleAction('activate')}
              disabled={loading}
              className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50"
            >
              {loading ? '...' : '✅ Valider'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={loading}
              className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
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
              className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg hover:bg-orange-500/30 transition disabled:opacity-50"
            >
              {loading ? '...' : '⏸️ Suspendre'}
            </button>
            <button
              onClick={() => handleAction('revoke')}
              disabled={loading}
              className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
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
              className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50"
            >
              {loading ? '...' : '▶️ Réactiver'}
            </button>
            <button
              onClick={() => handleAction('revoke')}
              disabled={loading}
              className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
            >
              {loading ? '...' : '🚫 Révoquer'}
            </button>
          </>
        )}

        {(currentStatus === 'REVOKED' || currentStatus === 'EXPIRED') && (
          <p className="text-gray-400 text-sm">Aucune action disponible</p>
        )}
      </div>
    </div>
  )
}
