'use client'

import { ExternalLink, FileText } from 'lucide-react'
import StatusBadge from '@/app/components/admin/StatusBadge'
import TypeBadge from '@/app/components/admin/TypeBadge'
import ActionButton from '@/app/components/admin/ActionButton'

type Entry = {
  id: string
  entityName: string
  entityEmail: string | null
  entityType: string
  siret: string | null
  documents: unknown
  status: string
  adminValidatedAt: Date | null
  adminRejectReason: string | null
  createdAt: Date
  user: { email: string | null; name: string | null }
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-white/5 px-4 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">
      {children}
    </th>
  )
}

export default function AdminDemandesClient({ entries }: { entries: Entry[] }) {
  const handleApprove = async (id: string) => {
    if (!confirm('Valider cette demande ?')) return
    try {
      const res = await fetch(`/api/admin/demandes/${id}/approve`, { method: 'PATCH', credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      window.location.reload()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur inconnue')
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Raison du rejet (obligatoire)')
    if (!reason?.trim()) return
    try {
      const res = await fetch(`/api/admin/demandes/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error(await res.text())
      window.location.reload()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erreur inconnue')
    }
  }

  const docs = (d: unknown): string[] =>
    Array.isArray(d) ? d.filter((x): x is string => typeof x === 'string') : []

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--bt-border)', background: 'rgba(13,31,60,0.5)' }}>
      <table className="w-full text-left">
        <thead>
          <tr>
            <TH>Demandeur</TH>
            <TH>Entité</TH>
            <TH>Type</TH>
            <TH>SIRET</TH>
            <TH>Documents</TH>
            <TH>Date</TH>
            <TH>Statut</TH>
            <TH>Actions</TH>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-white/5 transition-all hover:bg-white/[0.02]">
              <td className="px-4 py-4">
                <p className="text-sm text-white">{e.user.name || '—'}</p>
                <p className="text-xs text-white/50">{e.user.email}</p>
              </td>
              <td className="px-4 py-4 text-sm text-white/80">{e.entityName}</td>
              <td className="px-4 py-4">
                <TypeBadge variant={e.entityType === 'INDIVIDUAL' ? 'B2C' : 'B2B'} />
              </td>
              <td className="px-4 py-4 font-mono text-sm text-white/60">{e.siret || '—'}</td>
              <td className="px-4 py-4">
                {docs(e.documents).length > 0 ? (
                  <ul className="space-y-1">
                    {docs(e.documents).map((doc, i, arr) => (
                      <li key={doc}>
                        <a
                          href={`/api/admin/demandes/document?path=${encodeURIComponent(doc)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-bt-cyan/25 bg-bt-cyan/5 px-2 py-1 text-xs text-bt-cyan/90 transition hover:border-bt-cyan/60 hover:bg-bt-cyan/15 hover:text-bt-cyan"
                        >
                          <FileText className="h-3 w-3" />
                          {arr.length > 1 ? `Voir document ${i + 1}` : 'Voir le document'}
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-white/30">—</span>
                )}
              </td>
              <td className="px-4 py-4 font-mono text-xs text-white/50">
                {new Date(e.createdAt).toLocaleDateString('fr-FR')}
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={e.status} type="trust" />
              </td>
              <td className="px-4 py-4">
                {e.status === 'PENDING_ADMIN' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButton variant="validate" onClick={() => handleApprove(e.id)} />
                    <ActionButton variant="reject" onClick={() => handleReject(e.id)} />
                  </div>
                ) : (
                  <span className="text-xs italic text-white/30">Aucune action</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
