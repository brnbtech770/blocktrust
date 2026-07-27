'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { showToast } from '@/app/lib/show-toast'

type ManageableOrg = {
  slug: string
  name: string
}

export default function CreateVaultForm({ orgs }: { orgs: ManageableOrg[] }) {
  const router = useRouter()
  const [orgSlug, setOrgSlug] = useState(orgs[0]?.slug ?? '')
  const [vaultName, setVaultName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgSlug || !vaultName.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/organization/${encodeURIComponent(orgSlug)}/vaults`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: vaultName.trim() }),
      })
      const j = (await res.json()) as { error?: string; vault?: { id: string } }
      if (!res.ok) {
        setError(j.error ?? 'Création impossible')
        showToast(j.error ?? 'Création impossible', 'error')
        return
      }
      setVaultName('')
      showToast('Coffre créé', 'success')
      if (j.vault?.id) {
        router.push(`/dashboard/vault/${j.vault.id}`)
      } else {
        router.refresh()
      }
    } catch {
      setError('Erreur réseau')
      showToast('Erreur réseau', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (orgs.length === 0) return null

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 rounded-xl border border-bt-cyan/20 bg-bt-cyan/5 p-4"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-bt-cyan/90">
        Créer un coffre-fort
      </p>
      {orgs.length > 1 ? (
        <label className="mb-2 block text-xs text-white/50">
          Organisation
          <select
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
          >
            {orgs.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="flex-1 rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
          placeholder="Nom du coffre (ex. RIB société)"
          value={vaultName}
          onChange={(e) => setVaultName(e.target.value)}
          maxLength={120}
        />
        <button
          type="submit"
          disabled={busy || !vaultName.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-sm font-medium text-bt-cyan disabled:opacity-40"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Créer un coffre
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </form>
  )
}
