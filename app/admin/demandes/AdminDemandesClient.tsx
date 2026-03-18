'use client'

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

export default function AdminDemandesClient({ entries }: { entries: Entry[] }) {
  const handleApprove = async (id: string) => {
    if (!confirm('Valider cette demande ?')) return
    try {
      const res = await fetch(`/api/admin/demandes/${id}/approve`, { method: 'PATCH', credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      window.location.reload()
    } catch (e: any) {
      alert(e.message)
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
    } catch (e: any) {
      alert(e.message)
    }
  }

  const docs = (d: unknown): string[] => (Array.isArray(d) ? d.filter((x): x is string => typeof x === 'string') : [])

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--bt-border)', background: 'rgba(13,31,60,0.8)' }}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--bt-border)' }}>
            <th className="px-4 py-3 text-xs font-medium text-gray-400">Demandeur</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400">Entité</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400">Type</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400">SIRET</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400">Documents</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400">Date</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400">Statut</th>
            <th className="px-4 py-3 text-xs font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b" style={{ borderColor: 'var(--bt-border)' }}>
              <td className="px-4 py-3">
                <p className="text-sm text-white">{e.user.name || '—'}</p>
                <p className="text-xs text-gray-500">{e.user.email}</p>
              </td>
              <td className="px-4 py-3 text-sm text-gray-300">{e.entityName}</td>
              <td className="px-4 py-3 text-sm text-gray-400">{e.entityType}</td>
              <td className="px-4 py-3 text-sm text-gray-400">{e.siret || '—'}</td>
              <td className="px-4 py-3">
                {docs(e.documents).map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block text-xs text-cyan-400 hover:underline truncate max-w-[120px]">
                    Voir
                  </a>
                ))}
                {docs(e.documents).length === 0 && '—'}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">{new Date(e.createdAt).toLocaleDateString('fr-FR')}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  e.status === 'ADMIN_VERIFIED' ? 'bg-green-500/20 text-green-400' :
                  e.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {e.status}
                </span>
              </td>
              <td className="px-4 py-3 flex gap-2">
                {e.status === 'PENDING_ADMIN' && (
                  <>
                    <button
                      onClick={() => handleApprove(e.id)}
                      className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => handleReject(e.id)}
                      className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      Rejeter
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
