'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { getPlanDisplayLabel } from '@/lib/plan-features'
import { Users, Vault } from 'lucide-react'

const TIERS = ['STARTER', 'TEAM', 'ENTERPRISE'] as const

type MemberRow = {
  id: string
  role: string
  email: string | null
  name: string | null
}

export default function AdminOrganizationsActions({
  orgId,
  orgName,
  slug,
  tier,
  isSuspended,
}: {
  orgId: string
  orgName: string
  slug: string
  tier: string
  isSuspended: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [members, setMembers] = useState<MemberRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState(
    tier === 'SUSPENDED' ? 'STARTER' : tier,
  )

  async function loadMembers() {
    setError(null)
    setMembersOpen(true)
    if (members !== null) return
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/members`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Chargement impossible')
        return
      }
      setMembers(Array.isArray(data.members) ? data.members : [])
    } catch {
      setError('Erreur réseau')
    }
  }

  async function patchOrg(body: Record<string, string>) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Action impossible')
        return
      }
      router.refresh()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void loadMembers()}
          className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-xs text-white/70 hover:bg-white/5"
        >
          <Users className="h-3 w-3" aria-hidden />
          Membres
        </button>
        <Link
          href={`/dashboard/organization/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 text-xs text-bt-cyan/90 hover:bg-white/5"
        >
          <Vault className="h-3 w-3" aria-hidden />
          Vault
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedTier}
          disabled={loading || isSuspended}
          onChange={(e) => setSelectedTier(e.target.value)}
          className="rounded border border-white/15 bg-transparent px-2 py-1 text-xs text-white"
          aria-label={`Tier pour ${orgName}`}
        >
          {TIERS.map((t) => (
            <option key={t} value={t} className="bg-[#0a1628]">
              {getPlanDisplayLabel(t)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={loading || isSuspended}
          onClick={() => void patchOrg({ tier: selectedTier })}
          className="rounded border border-bt-cyan/30 px-2 py-1 text-xs text-bt-cyan hover:bg-bt-cyan/10 disabled:opacity-50"
        >
          Appliquer tier
        </button>
        {isSuspended ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void patchOrg({ action: 'unsuspend', tier: selectedTier })}
            className="rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
          >
            Réactiver
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => void patchOrg({ action: 'suspend' })}
            className="rounded border border-amber-500/30 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
          >
            Suspendre
          </button>
        )}
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {membersOpen && (
        <div className="mt-1 rounded border border-white/10 bg-white/[0.03] p-2 text-xs">
          <p className="mb-1 font-semibold text-white/70">Membres — {orgName}</p>
          {members === null ? (
            <p className="text-white/40">Chargement…</p>
          ) : members.length === 0 ? (
            <p className="text-white/40">Aucun membre</p>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.id} className="text-white/60">
                  {m.email ?? '—'} · {m.role}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setMembersOpen(false)}
            className="mt-2 text-white/40 hover:text-white/60"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  )
}
