'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ActionButton, { NoActionText } from './ActionButton'

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {currentStatus === 'PENDING' && (
          <>
            <ActionButton variant="validate" onClick={() => handleAction('activate')} loading={loading} />
            <ActionButton variant="reject" onClick={() => handleAction('reject')} loading={loading} />
          </>
        )}
        {(currentStatus === 'ACTIVE' || currentStatus === 'ANCHORED') && (
          <>
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
        {(currentStatus === 'REVOKED' || currentStatus === 'EXPIRED') && (
          <NoActionText text="Aucune action disponible" />
        )}
      </div>
    </div>
  )
}
