'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CreateOrgForm({ disabled }: { disabled: boolean }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled || busy || name.trim().length < 2) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = (await res.json()) as {
        error?: string
        organization?: { slug: string }
        code?: string
      }
      if (res.status === 409 && data.code === 'ORG_ALREADY_EXISTS' && data.organization?.slug) {
        router.replace(`/dashboard/organization/${data.organization.slug}`)
        router.refresh()
        return
      }
      if (!res.ok) {
        setError(data.error ?? 'Échec de la création')
        return
      }
      if (data.organization?.slug) {
        router.replace(`/dashboard/organization/${data.organization.slug}`)
        router.refresh()
        return
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setBusy(false)
    }
  }

  if (disabled) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
        Un abonnement équipe (Starter, Team ou supérieur) est requis pour créer une organisation.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-bt-cyan/90">Nouvelle organisation</p>
      <p className="text-xs text-white/45">
        Créez d&apos;abord votre organisation (équipe), puis créez un coffre-fort depuis l&apos;onglet{' '}
        <span className="text-white/60">Coffre-fort</span>.
      </p>
      <input
        className="w-full rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
        placeholder="Nom de l’organisation"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={120}
        autoComplete="organization"
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || name.trim().length < 2}
        className="rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-sm font-medium text-bt-cyan transition hover:bg-bt-cyan/25 disabled:opacity-40"
      >
        {busy ? 'Création…' : 'Créer une organisation'}
      </button>
    </form>
  )
}
