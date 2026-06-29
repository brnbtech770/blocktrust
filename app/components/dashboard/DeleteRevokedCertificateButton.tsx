'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

type DeleteRevokedCertificateButtonProps = {
  certificateId: string
  onDeleted: () => void
}

export default function DeleteRevokedCertificateButton({
  certificateId,
  onDeleted,
}: DeleteRevokedCertificateButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce certificat révoqué ?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/certificates/${certificateId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression')
      }
      onDeleted()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={loading}
      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
      aria-label="Supprimer ce certificat révoqué"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
      )}
      Supprimer
    </button>
  )
}
