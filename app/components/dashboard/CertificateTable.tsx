// app/components/dashboard/CertificateTable.tsx
// Tableau des certificats : Voir → /dashboard/certificate/[id], Révoquer → modal + POST revoke
// ============================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CertificateTableItem } from '@/types/dashboard'
import { Eye, ShieldOff } from 'lucide-react'

export interface CertificateTableProps {
  certificates: CertificateTableItem[]
}

function entityDisplayName(entity: CertificateTableItem['entity']): string {
  if (entity.entityType === 'INDIVIDUAL') {
    const name = [entity.firstName, entity.lastName].filter(Boolean).join(' ')
    return name || entity.email
  }
  return entity.legalName || entity.tradeName || entity.email
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-[var(--bt-success)]/20 text-[var(--bt-success)] border-[var(--bt-success)]/40',
    ANCHORED: 'bg-[var(--bt-gold)]/20 text-[var(--bt-gold)] border-[var(--bt-gold)]/40',
    PENDING: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
    REVOKED: 'bg-[var(--bt-danger)]/20 text-[var(--bt-danger)] border-[var(--bt-danger)]/40',
    EXPIRED: 'bg-[var(--bt-warn)]/20 text-[var(--bt-warn)] border-[var(--bt-warn)]/40',
    SUSPENDED: 'bg-[var(--bt-warn)]/20 text-[var(--bt-warn)] border-[var(--bt-warn)]/40',
  }
  const s = styles[status] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/40'
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${s}`}>
      {status}
    </span>
  )
}

export default function CertificateTable({ certificates }: CertificateTableProps) {
  const router = useRouter()
  const [revokeModal, setRevokeModal] = useState<CertificateTableItem | null>(null)
  const [revoking, setRevoking] = useState(false)

  const handleRevokeConfirm = async () => {
    if (!revokeModal) return
    setRevoking(true)
    try {
      const res = await fetch(`/api/certificates/${revokeModal.id}/revoke`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setRevokeModal(null)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la révocation')
    } finally {
      setRevoking(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-gray-700 bg-[var(--bt-navy)]/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-black/20">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  Entité / ID
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  Statut
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  Vérifications
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  Émis le
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-32" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {certificates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Aucun certificat
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => (
                  <tr key={cert.id} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{entityDisplayName(cert.entity)}</div>
                      <div className="text-xs text-gray-500 font-mono">{cert.publicId ?? cert.id}</div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(cert.status)}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-300">{cert.verificationCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(cert.issuedAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/certificate/${cert.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--bt-gold)]/20 px-2 py-1.5 text-sm font-medium text-[var(--bt-gold)] hover:bg-[var(--bt-gold)]/30 transition-colors"
                        >
                          <Eye className="w-4 h-4" /> Voir
                        </Link>
                        {cert.status !== 'REVOKED' && cert.status !== 'EXPIRED' && (
                          <button
                            type="button"
                            onClick={() => setRevokeModal(cert)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--bt-danger)]/20 px-2 py-1.5 text-sm font-medium text-[var(--bt-danger)] hover:bg-[var(--bt-danger)]/30 transition-colors"
                          >
                            <ShieldOff className="w-4 h-4" /> Révoquer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-700 bg-[var(--bt-navy)] p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Révoquer le certificat ?
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Cette action est irréversible. Le certificat <span className="font-mono text-[var(--bt-gold)]">{revokeModal.publicId ?? revokeModal.id}</span> ne pourra plus être utilisé.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevokeModal(null)}
                disabled={revoking}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRevokeConfirm}
                disabled={revoking}
                className="rounded-lg bg-[var(--bt-danger)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {revoking ? 'Révoquer...' : 'Révoquer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
