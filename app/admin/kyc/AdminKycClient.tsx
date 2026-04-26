'use client'

import { useState } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import StatusBadge from '@/app/components/admin/StatusBadge'
import TypeBadge from '@/app/components/admin/TypeBadge'
import ActionButton from '@/app/components/admin/ActionButton'

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
  siretVerifiedByInsee?: boolean
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-white/5 px-4 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">
      {children}
    </th>
  )
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
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 font-sans text-sm font-medium transition-all ${
              filter === f
                ? 'border border-bt-cyan/50 bg-bt-cyan/20 text-bt-cyan'
                : 'border border-white/10 bg-white/5 text-white/50 hover:text-white'
            }`}
          >
            {f === 'all' ? 'Tous' : f}
          </button>
        ))}
      </div>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--bt-border)', background: 'rgba(13,31,60,0.5)' }}>
        <table className="w-full text-left">
          <thead>
            <tr>
              <TH>Utilisateur</TH>
              <TH>Type</TH>
              <TH>Statut KYC</TH>
              <TH>SIRET</TH>
              <TH>Date</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-white/5 transition-all hover:bg-white/[0.02]">
                <td className="px-4 py-4">
                  <p className="font-medium text-white">{u.name || '—'}</p>
                  <p className="text-xs text-white/50">{u.email}</p>
                </td>
                <td className="px-4 py-4">
                  <TypeBadge variant={u.accountType === 'INDIVIDUAL' ? 'B2C' : 'B2B'} />
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={u.kycStatus ?? 'PENDING'} type="kyc" />
                </td>
                <td className="px-4 py-4">
                  {u.siret ? (
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-mono text-sm text-white/70">{u.siret}</span>
                      {u.siretVerifiedByInsee ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          INSEE ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          SIRET non vérifié
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-white/50">
                  {u.kycVerifiedAt ? new Date(u.kycVerifiedAt).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {(u.kycStatus ?? 'PENDING') === 'PENDING' ? (
                      <>
                        <ActionButton variant="validate" onClick={() => handleApprove(u.id)} />
                        <ActionButton
                          variant="reject"
                          onClick={() => setRejecting(rejecting === u.id ? null : u.id)}
                        />
                      </>
                    ) : null}
                  </div>
                  {rejecting === u.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Raison du rejet"
                        className="w-56 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-sans text-xs text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleReject(u.id)}
                        disabled={!rejectReason.trim()}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-sans text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
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
