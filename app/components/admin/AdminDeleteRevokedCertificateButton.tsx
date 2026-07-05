'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

type AdminDeleteRevokedCertificateButtonProps = {
  certificateId: string
}

export default function AdminDeleteRevokedCertificateButton({
  certificateId,
}: AdminDeleteRevokedCertificateButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (
      !confirm(
        'Supprimer définitivement ce certificat révoqué ? Cette action est irréversible.',
      )
    ) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/certificates/${certificateId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error ?? 'Erreur lors de la suppression')
      }
      router.refresh()
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
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
      aria-label="Supprimer ce certificat révoqué"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      )}
      Supprimer
    </button>
  )
}
