'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { OrgRole, VaultEntryType } from '@prisma/client'
import { Edit, ExternalLink, Loader2, Trash2, Upload } from 'lucide-react'
import { showToast } from '@/app/lib/show-toast'
import { VAULT_ENTRY_TYPE_LABELS } from '@/lib/vault-entry-labels'

type EntryRow = {
  id: string
  name: string
  type: VaultEntryType
  value: string
  description: string | null
  createdAt: string
}

const ENTRY_TYPES: VaultEntryType[] = [
  'CONTACT',
  'DOMAIN',
  'EMAIL',
  'PHONE',
  'URL',
  'WALLET',
]

type EditEntryState = {
  id: string
  name: string
  type: VaultEntryType
  value: string
  description: string
}

export default function VaultDetailClient(props: {
  vaultId: string
  organizationSlug: string
  organizationName: string
  canEdit: boolean
  canDeleteVault: boolean
  membershipRole: OrgRole
}) {
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [vaultName, setVaultName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState('')
  const [type, setType] = useState<VaultEntryType>('EMAIL')
  const [value, setValue] = useState('')
  const [desc, setDesc] = useState('')

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [editEntry, setEditEntry] = useState<EditEntryState | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    setLoading(true)
    const res = await fetch(`/api/vault/${encodeURIComponent(props.vaultId)}`)
    const j = (await res.json()) as {
      error?: string
      vault?: { name: string }
      entries?: EntryRow[]
    }
    if (!res.ok) {
      setErr(j.error ?? 'Chargement impossible')
      setEntries([])
      setLoading(false)
      return
    }
    setVaultName(j.vault?.name ?? null)
    setEntries(j.entries ?? [])
    setLoading(false)
  }, [props.vaultId])

  useEffect(() => {
    void load()
  }, [load])

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!props.canEdit || busy || !name.trim() || !value.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/vault/${encodeURIComponent(props.vaultId)}/entries`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          value: value.trim(),
          description: desc.trim() || null,
        }),
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErr(j.error ?? 'Ajout impossible')
        return
      }
      setName('')
      setValue('')
      setDesc('')
      showToast('Entrée ajoutée', 'success')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function saveEntryEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editEntry || !props.canEdit || busy) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(
        `/api/vault/${encodeURIComponent(props.vaultId)}/entries/${encodeURIComponent(editEntry.id)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: editEntry.name.trim(),
            type: editEntry.type,
            value: editEntry.value.trim(),
            description: editEntry.description.trim() || null,
          }),
        },
      )
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErr(j.error ?? 'Modification impossible')
        return
      }
      setEditEntry(null)
      showToast('Entrée modifiée', 'success')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function deleteEntry(entryId: string) {
    if (!props.canEdit || busy) return
    if (!confirm('Supprimer cette entrée ?')) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(
        `/api/vault/${encodeURIComponent(props.vaultId)}/entries/${encodeURIComponent(entryId)}`,
        { method: 'DELETE' },
      )
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErr(j.error ?? 'Suppression impossible')
        return
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function onCsvFile(file: File | null) {
    if (!file || !props.canEdit || busy) return
    const text = await file.text()
    const rows = parseCsvLoose(text)
    if (rows.length === 0) {
      setErr('Aucune ligne valide dans le fichier')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/vault/${encodeURIComponent(props.vaultId)}/entries/bulk`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entries: rows }),
      })
      const j = (await res.json()) as { error?: string; skipped?: number; created?: number }
      if (!res.ok) {
        setErr(j.error ?? 'Import impossible')
        return
      }
      if (j.skipped && j.skipped > 0) {
        setErr(`Import partiel : ${j.created ?? 0} créées, ${j.skipped} ignorées (quota).`)
      } else {
        showToast(`${j.created ?? rows.length} entrée(s) importée(s)`, 'success')
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function renameVault(e: React.FormEvent) {
    e.preventDefault()
    if (!props.canEdit || busy || !renameValue.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/vault/${encodeURIComponent(props.vaultId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      })
      const j = (await res.json()) as { error?: string; vault?: { name: string } }
      if (!res.ok) {
        setErr(j.error ?? 'Renommage impossible')
        return
      }
      setVaultName(j.vault?.name ?? renameValue.trim())
      setRenameOpen(false)
      showToast('Coffre renommé', 'success')
    } finally {
      setBusy(false)
    }
  }

  async function deleteVault() {
    if (!props.canDeleteVault || busy) return
    if (!confirm('Supprimer ce coffre et toutes ses entrées ? Cette action est irréversible.')) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/vault/${encodeURIComponent(props.vaultId)}`, {
        method: 'DELETE',
      })
      const j = (await res.json()) as { error?: string }
      if (!res.ok) {
        setErr(j.error ?? 'Suppression impossible')
        return
      }
      showToast('Coffre supprimé', 'warning')
      window.location.href = `/dashboard/organization/${props.organizationSlug}`
    } finally {
      setBusy(false)
    }
  }

  function verifyHref(entry: EntryRow): string | null {
    if (entry.type === 'EMAIL') {
      return `/verify?email=${encodeURIComponent(entry.value.trim())}`
    }
    if (entry.type === 'DOMAIN') {
      return `/verify?domain=${encodeURIComponent(entry.value.trim())}`
    }
    return null
  }

  return (
    <div className="mx-auto max-w-4xl font-sans text-white/85">
      <nav className="mb-4 text-xs text-white/45">
        <Link href="/dashboard/organization" className="hover:text-bt-cyan">
          Organisation
        </Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/dashboard/organization/${props.organizationSlug}`}
          className="hover:text-bt-cyan"
        >
          {props.organizationName}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-white/70">Vault</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-syne text-2xl font-bold text-white">
          {vaultName ?? 'Coffre'}
        </h1>
        {props.canEdit || props.canDeleteVault ? (
          <div className="flex flex-wrap gap-2">
            {props.canEdit ? (
              <button
                type="button"
                onClick={() => {
                  setRenameValue(vaultName ?? '')
                  setRenameOpen(true)
                }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-bt-cyan/30 hover:text-white disabled:opacity-40"
              >
                <Edit className="h-3.5 w-3.5" aria-hidden />
                Renommer
              </button>
            ) : null}
            {props.canDeleteVault ? (
              <button
                type="button"
                onClick={() => void deleteVault()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/15 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Supprimer
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {err ? (
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {err}
        </p>
      ) : null}

      {props.membershipRole === 'MEMBER' && !props.canEdit ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
          Vous avez accès en lecture seule à ce coffre. Contactez un administrateur pour ajouter des
          entrées.
        </div>
      ) : null}

      {props.canEdit ? (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[#0d1f3c]/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-bt-cyan/90">
            Ajouter une donnée de référence
          </p>
          <p className="text-xs text-white/45">
            Exemples : RIB fournisseur, IBAN client, email officiel à surveiller.
          </p>
          <form onSubmit={addEntry} className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              placeholder="Nom de la donnée (ex. RIB Fournisseur X)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              value={type}
              onChange={(e) => setType(e.target.value as VaultEntryType)}
            >
              {ENTRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {VAULT_ENTRY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              className="sm:col-span-2 rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              placeholder="Donnée à protéger (ex. FR76 3000 …)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <input
              className="sm:col-span-2 rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              placeholder="Note interne (optionnel)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy || !name.trim() || !value.trim()}
              className="rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-sm font-medium text-bt-cyan disabled:opacity-40 sm:col-span-2"
            >
              Enregistrer
            </button>
          </form>

          <div className="border-t border-white/10 pt-4">
            <label className="inline-flex cursor-pointer flex-wrap items-center gap-2 text-xs text-white/55">
              <Upload className="h-4 w-4 text-bt-cyan" aria-hidden />
              <span>Importer CSV (colonnes : name,type,value)</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => void onCsvFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-white/45">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Chargement…
          </div>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-white/45">Aucune entrée.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-3 py-2">Libellé</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Valeur</th>
                <th className="px-3 py-2 w-28" />
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => {
                const href = verifyHref(row)
                return (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="px-3 py-2 text-white">{row.name}</td>
                    <td className="px-3 py-2 text-xs text-bt-cyan/90">
                      {VAULT_ENTRY_TYPE_LABELS[row.type]}
                    </td>
                    <td className="max-w-[280px] truncate px-3 py-2 font-mono text-xs text-white/70">
                      {row.value}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {href ? (
                          <Link
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded p-1 text-bt-cyan/80 hover:bg-bt-cyan/10"
                            aria-label="Vérifier sur /verify"
                            title="Vérifier sur /verify"
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden />
                          </Link>
                        ) : null}
                        {props.canEdit ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setEditEntry({
                                  id: row.id,
                                  name: row.name,
                                  type: row.type,
                                  value: row.value,
                                  description: row.description ?? '',
                                })
                              }
                              disabled={busy}
                              className="rounded p-1 text-white/55 hover:bg-white/10 hover:text-white disabled:opacity-40"
                              aria-label="Modifier"
                            >
                              <Edit className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteEntry(row.id)}
                              disabled={busy}
                              className="rounded p-1 text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {renameOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-vault-title"
        >
          <form
            onSubmit={renameVault}
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d1f3c] p-5 shadow-xl"
          >
            <h2 id="rename-vault-title" className="font-syne text-lg font-semibold text-white">
              Renommer le coffre
            </h2>
            <input
              className="mt-4 w-full rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={120}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameOpen(false)}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy || !renameValue.trim()}
                className="rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-sm font-medium text-bt-cyan disabled:opacity-40"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editEntry ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-entry-title"
        >
          <form
            onSubmit={saveEntryEdit}
            className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0d1f3c] p-5 shadow-xl"
          >
            <h2 id="edit-entry-title" className="font-syne text-lg font-semibold text-white">
              Modifier l&apos;entrée
            </h2>
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
                placeholder="Libellé"
                value={editEntry.name}
                onChange={(e) => setEditEntry({ ...editEntry, name: e.target.value })}
              />
              <select
                className="rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
                value={editEntry.type}
                onChange={(e) =>
                  setEditEntry({ ...editEntry, type: e.target.value as VaultEntryType })
                }
              >
                {ENTRY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {VAULT_ENTRY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
                placeholder="Valeur"
                value={editEntry.value}
                onChange={(e) => setEditEntry({ ...editEntry, value: e.target.value })}
              />
              <input
                className="rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
                placeholder="Description (optionnel)"
                value={editEntry.description}
                onChange={(e) => setEditEntry({ ...editEntry, description: e.target.value })}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditEntry(null)}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy || !editEntry.name.trim() || !editEntry.value.trim()}
                className="rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-sm font-medium text-bt-cyan disabled:opacity-40"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function parseCsvLoose(text: string): { name: string; type: VaultEntryType; value: string }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const out: { name: string; type: VaultEntryType; value: string }[] = []
  let start = 0
  if (lines.length > 0) {
    const h = lines[0].split(',').map((c) => c.trim().toLowerCase())
    if (h[0] === 'name' && h[1] === 'type' && h[2] === 'value') start = 1
  }
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(',').map((c) => c.trim())
    if (parts.length < 3) continue
    const t = parts[1].toUpperCase()
    if (!ENTRY_TYPES.includes(t as VaultEntryType)) continue
    out.push({
      name: parts[0],
      type: t as VaultEntryType,
      value: parts.slice(2).join(','),
    })
  }
  return out
}
