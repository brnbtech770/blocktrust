// app/components/dashboard/CertificateTable.tsx
// Tableau des certificats : Voir → /dashboard/certificate/[id], Révoquer → modal + POST revoke
// ============================================================

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CertificateTableItem } from '@/types/dashboard'
import { Eye, ShieldOff } from 'lucide-react'

export interface CertificateTableProps {
  certificates: CertificateTableItem[]
}

type FilterKey = 'all' | 'active' | 'pending' | 'revoked'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',     label: 'Tous' },
  { key: 'active',  label: 'Actifs' },
  { key: 'pending', label: 'En attente' },
  { key: 'revoked', label: 'Révoqués' },
]

function entityDisplayName(entity: CertificateTableItem['entity']): string {
  if (entity.entityType === 'INDIVIDUAL') {
    const name = [entity.firstName, entity.lastName].filter(Boolean).join(' ')
    return name || entity.email
  }
  return entity.legalName || entity.tradeName || entity.email
}

function statusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    ACTIVE:    { bg: 'rgba(0,212,255,0.1)',  text: '#00d4ff',         border: 'rgba(0,212,255,0.3)' },
    ANCHORED:  { bg: 'rgba(189,167,107,0.15)', text: 'var(--bt-gold)', border: 'rgba(189,167,107,0.3)' },
    PENDING:   { bg: 'rgba(189,167,107,0.1)',  text: 'var(--bt-gold)', border: 'rgba(189,167,107,0.25)' },
    REVOKED:   { bg: 'rgba(239,68,68,0.20)',   text: '#f87171',        border: 'rgba(239,68,68,0.35)' },
    EXPIRED:   { bg: 'rgba(232,148,58,0.15)',  text: 'var(--bt-warn)', border: 'rgba(232,148,58,0.3)' },
    SUSPENDED: { bg: 'rgba(232,148,58,0.15)',  text: 'var(--bt-warn)', border: 'rgba(232,148,58,0.3)' },
  }
  const s = styles[status] ?? { bg: 'rgba(255,255,255,0.08)', text: 'var(--bt-muted)', border: 'var(--bt-border)' }
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {status}
    </span>
  )
}

function matchesFilter(status: string, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'active':
      return status === 'ACTIVE' || status === 'ANCHORED'
    case 'pending':
      return status === 'PENDING'
    case 'revoked':
      return status === 'REVOKED' || status === 'EXPIRED'
    default:
      return true
  }
}

export default function CertificateTable({ certificates }: CertificateTableProps) {
  const router = useRouter()
  const [revokeModal, setRevokeModal] = useState<CertificateTableItem | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = useMemo(
    () => certificates.filter((c) => matchesFilter(c.status, filter)),
    [certificates, filter]
  )

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
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {FILTERS.map((tab) => {
          const isActive = filter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`font-sans text-sm transition-colors ${
                isActive
                  ? 'text-bt-cyan'
                  : 'text-white/50 hover:text-white'
              }`}
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all hover:border-gold/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'var(--bt-border)' }}>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>
                  Contact / ID
                </th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>
                  Statut
                </th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>
                  Vérifications
                </th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>
                  Émis le
                </th>
                <th className="px-4 py-3 text-[10px] font-medium uppercase tracking-wider w-32" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--bt-muted)' }}>
                    Aucun certificat
                  </td>
                </tr>
              ) : (
                filtered.map((cert) => {
                  const isRevoked = cert.status === 'REVOKED' || cert.status === 'EXPIRED'
                  return (
                    <tr
                      key={cert.id}
                      className={`border-b transition-colors hover:bg-[rgba(0,212,255,0.04)] ${isRevoked ? 'opacity-60' : ''}`}
                      style={{ borderColor: 'var(--bt-border)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{entityDisplayName(cert.entity)}</div>
                        <div className="mt-2 space-y-2">
                          <div>
                            <p className="font-mono text-xs text-gray-400">{cert.publicId ?? "—"}</p>
                            <span className="text-[10px] text-white/30">ID à partager pour vérification</span>
                          </div>
                          <div>
                            <p className="break-all font-mono text-xs text-gray-500">{cert.id}</p>
                            <span className="text-[10px] text-white/30">ID technique interne</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(cert.status)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-300">{cert.verificationCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(cert.issuedAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/certificate/${cert.publicId ?? cert.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[var(--bt-gold)]/20 px-2 py-1.5 text-sm font-medium text-[var(--bt-gold)] hover:bg-[var(--bt-gold)]/30 transition-colors"
                          >
                            <Eye className="w-4 h-4" /> Voir
                          </Link>
                          {!isRevoked && (
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {revokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-lg">
            <h3 className="font-syne mb-2 text-lg font-bold tracking-tight text-white">
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
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 disabled:opacity-50"
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
