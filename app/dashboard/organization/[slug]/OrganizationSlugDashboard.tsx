'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { OrgRole } from '@prisma/client'
import { Loader2, MailPlus, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { showToast } from '@/app/lib/show-toast'

type OrgPayload = {
  organization: {
    id: string
    name: string
    slug: string
    tier: string
    maxSeats: number
    quotas: { maxVaults: number; maxEntries: number }
    vaultCount: number
    entryCount: number
  }
  membership: { role: OrgRole }
  members: {
    id: string
    role: OrgRole
    user: { id: string; email: string | null; name: string | null }
  }[]
}

type VaultRow = { id: string; name: string; entryCount: number }

const ASSIGNABLE_ROLES: OrgRole[] = ['ADMIN', 'MANAGER', 'MEMBER']

const ROLE_LABELS: Record<OrgRole, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  MANAGER: 'Gestionnaire',
  MEMBER: 'Membre',
  VIEWER: 'Lecteur',
}

function canManageVaults(r: OrgRole): boolean {
  return r === 'OWNER' || r === 'ADMIN' || r === 'MANAGER'
}

function canManageOrg(r: OrgRole): boolean {
  return r === 'OWNER' || r === 'ADMIN'
}

function canInviteMember(r: OrgRole): boolean {
  return r === 'OWNER' || r === 'ADMIN' || r === 'MANAGER'
}

export default function OrganizationSlugDashboard({ orgSlug }: { orgSlug: string }) {
  const [data, setData] = useState<OrgPayload | null>(null)
  const [vaults, setVaults] = useState<VaultRow[]>([])
  const [vaultsLoading, setVaultsLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [vaultName, setVaultName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const loadOrg = useCallback(async () => {
    setErr(null)
    const res = await fetch(`/api/organization/${encodeURIComponent(orgSlug)}`)
    const j = (await res.json()) as OrgPayload & { error?: string }
    if (!res.ok) {
      setErr(j.error ?? 'Chargement impossible')
      setData(null)
      return
    }
    setData(j)
  }, [orgSlug])

  const loadVaults = useCallback(async () => {
    setVaultsLoading(true)
    const res = await fetch(`/api/organization/${encodeURIComponent(orgSlug)}/vaults`)
    const j = (await res.json()) as { vaults?: VaultRow[]; error?: string }
    if (!res.ok) {
      setErr(j.error ?? 'Impossible de charger les coffres')
    } else if (j.vaults) {
      setVaults(j.vaults)
    }
    setVaultsLoading(false)
  }, [orgSlug])

  useEffect(() => {
    void loadOrg()
  }, [loadOrg])

  useEffect(() => {
    if (data) void loadVaults()
  }, [data, loadVaults])

  async function createVault(e: React.FormEvent) {
    e.preventDefault()
    if (!data || !vaultName.trim() || busy || !canManageVaults(data.membership.role)) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/organization/${encodeURIComponent(orgSlug)}/vaults`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: vaultName.trim() }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErr(j.error ?? 'Création impossible')
        return
      }
      setVaultName('')
      showToast('Coffre créé', 'success')
      await loadOrg()
      await loadVaults()
    } finally {
      setBusy(false)
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!data || !inviteEmail.trim() || busy || !canInviteMember(data.membership.role)) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/organization/${encodeURIComponent(orgSlug)}/invite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErr(j.error ?? 'Invitation impossible')
        return
      }
      setInviteEmail('')
      showToast('Invitation envoyée', 'success')
      await loadOrg()
    } finally {
      setBusy(false)
    }
  }

  async function changeMemberRole(memberId: string, role: OrgRole) {
    if (!data || busy || !canManageOrg(data.membership.role)) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(
        `/api/organization/${encodeURIComponent(orgSlug)}/members/${encodeURIComponent(memberId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ role }),
        },
      )
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErr(j.error ?? 'Modification du rôle impossible')
        return
      }
      showToast('Rôle mis à jour', 'success')
      await loadOrg()
    } finally {
      setBusy(false)
    }
  }

  async function removeMember(memberId: string) {
    if (!data || busy || !canManageOrg(data.membership.role)) return
    if (!confirm('Retirer ce membre de l’équipe ?')) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(
        `/api/organization/${encodeURIComponent(orgSlug)}/members/${encodeURIComponent(memberId)}`,
        { method: 'DELETE' },
      )
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErr(j.error ?? 'Suppression impossible')
        return
      }
      showToast('Membre retiré', 'warning')
      await loadOrg()
    } finally {
      setBusy(false)
    }
  }

  if (err && !data) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
        {err}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/45">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement…
      </div>
    )
  }

  const o = data.organization
  const role = data.membership.role

  return (
    <div className="mx-auto max-w-3xl font-sans text-white/85">
      <div className="mb-6">
        <h1 className="font-syne text-2xl font-bold tracking-tight text-white">{o.name}</h1>
        <p className="mt-1 text-sm text-white/50">
          Plan coffre{' '}
          <span className="font-mono text-bt-cyan/90">{o.tier}</span>
          {' · '}
          {o.vaultCount} / {o.quotas.maxVaults} coffres · {o.entryCount} / {o.quotas.maxEntries} entrées
        </p>
      </div>

      {err ? (
        <p className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {err}
        </p>
      ) : null}

      <section className="mb-8 rounded-xl border border-white/10 bg-[#0d1f3c]/60 p-4">
        <div className="flex items-center gap-2 text-bt-cyan/90">
          <ShieldCheck className="h-4 w-4" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Coffre-fort (Vault)
          </h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/50">
          Stockez vos données de référence (RIB, IBAN, emails officiels) pour détecter les fraudes au
          faux virement. Ce n&apos;est pas la gestion des membres d&apos;équipe.
        </p>

        {canManageVaults(role) ? (
          <form onSubmit={createVault} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className="flex-1 rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              placeholder="Nom du coffre"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy || !vaultName.trim()}
              className="rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-sm font-medium text-bt-cyan disabled:opacity-40"
            >
              Créer un coffre
            </button>
          </form>
        ) : null}

        <ul className="mt-4 space-y-2">
          {vaultsLoading ? (
            <li className="text-xs text-white/40">Chargement des coffres…</li>
          ) : vaults.length === 0 ? (
            <li className="text-xs text-white/40">Aucun coffre pour l’instant.</li>
          ) : (
            vaults.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/dashboard/vault/${v.id}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm transition hover:border-bt-cyan/30"
                >
                  <span className="font-medium text-white">{v.name}</span>
                  <span className="text-xs text-white/40">{v.entryCount} entrées</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0d1f3c]/60 p-4">
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-white/50" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Équipe</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/45">
          Membres invités avec un compte BLOCKTRUST™. L&apos;organisation est l&apos;entité
          entreprise ; l&apos;équipe regroupe les collaborateurs qui y accèdent.
        </p>
        {canInviteMember(role) ? (
          <form onSubmit={sendInvite} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              className="flex-1 rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              placeholder="Email du collègue (compte BLOCKTRUST existant)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy || !inviteEmail.trim()}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-4 py-2 text-sm font-medium text-gold disabled:opacity-40"
            >
              <MailPlus className="h-4 w-4" aria-hidden />
              Inviter
            </button>
          </form>
        ) : null}

        <ul className="mt-4 divide-y divide-white/10">
          {data.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-white">{m.user.email}</p>
                {canManageOrg(role) && m.role !== 'OWNER' ? (
                  <select
                    value={m.role}
                    disabled={busy}
                    onChange={(e) => void changeMemberRole(m.id, e.target.value as OrgRole)}
                    className="mt-1 rounded border border-white/10 bg-[#060d1a] px-2 py-0.5 text-xs text-white/70 outline-none focus:border-bt-cyan/40"
                    aria-label={`Rôle de ${m.user.email ?? 'membre'}`}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-white/40">{ROLE_LABELS[m.role] ?? m.role}</p>
                )}
              </div>
              {canManageOrg(role) && m.role !== 'OWNER' ? (
                <button
                  type="button"
                  onClick={() => removeMember(m.id)}
                  disabled={busy}
                  className="shrink-0 rounded p-1.5 text-red-400 transition hover:bg-red-500/10 disabled:opacity-40"
                  aria-label="Retirer le membre"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
