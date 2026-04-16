'use client'

import { useState } from 'react'

type User = {
  id: string
  name: string | null
  email: string | null
  accountType: string
  kycStatus: string | null
  kycVerifiedAt: Date | null
  kycRejectedAt: Date | null
  kycRejectedReason: string | null
  siret: string | null
  companyName: string | null
  createdAt: Date
}

export default function AdminKycClient({ users }: { users: User[] }) {
  const [filter, setFilter] = useState<string>('all')
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const filtered = filter === 'all'
    ? users
    : users.filter((u) => (u.kycStatus ?? 'PENDING') === filter)

  const handleApprove = async (userId: string) => {
    if (!confirm('Valider manuellement ce KYC ?')) return
    try {
      const res = await fetch(`/api/admin/kyc/${userId}/approve`, { method: 'PATCH', credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      window.location.reload()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleReject = async (userId: string) => {
    if (!rejectReason.trim()) {
      alert('Veuillez indiquer une raison.')
      return
    }
    setRejecting(userId)
    try {
      const res = await fetch(`/api/admin/kyc/${userId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) throw new Error(await res.text())
      setRejecting(null)
      setRejectReason('')
      window.location.reload()
    } catch (e: any) {
      alert(e.message)
      setRejecting(null)
    }
  }

  return (
    <>
      <div className="flex gap-2 mb-6">
        {['all', 'PENDING', 'VERIFIED', 'REQUIRES_INPUT', 'REJECTED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f
                ? 'border border-bt-cyan/50 bg-bt-cyan/20 text-bt-cyan'
                : 'border border-white/10 bg-white/5 text-white/50'
            }`}
          >
            {f === 'all' ? 'Tous' : f}
          </button>
        ))}
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--bt-border)', background: 'rgba(13,31,60,0.8)' }}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--bt-border)' }}>
              <th className="px-4 py-3 text-xs font-medium text-gray-400">Utilisateur</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400">Type</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400">Statut KYC</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400">SIRET</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b" style={{ borderColor: 'var(--bt-border)' }}>
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{u.name || '—'}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{u.accountType}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    (u.kycStatus ?? 'PENDING') === 'VERIFIED' ? 'bg-green-500/20 text-green-400' :
                    (u.kycStatus ?? 'PENDING') === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {u.kycStatus ?? 'PENDING'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{u.siret || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{u.kycVerifiedAt ? new Date(u.kycVerifiedAt).toLocaleDateString('fr-FR') : '—'}</td>
                <td className="px-4 py-3 flex gap-2">
                  {(u.kycStatus ?? 'PENDING') === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(u.id)}
                        className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => setRejecting(rejecting === u.id ? null : u.id)}
                        className="px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        Rejeter
                      </button>
                    </>
                  )}
                  {rejecting === u.id && (
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Raison du rejet"
                        className="px-2 py-1 rounded text-xs bg-white/10 border border-white/20 text-white w-40"
                      />
                      <button
                        onClick={() => handleReject(u.id)}
                        disabled={!rejectReason.trim() || rejecting === u.id}
                        className="px-2 py-1 rounded text-xs bg-red-500 text-white"
                      >
                        Confirmer rejet
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
