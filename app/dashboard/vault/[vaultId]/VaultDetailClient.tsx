'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { VaultEntryType } from '@prisma/client'
import { Loader2, Trash2, Upload } from 'lucide-react'

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

export default function VaultDetailClient(props: {
  vaultId: string
  organizationSlug: string
  organizationName: string
  canEdit: boolean
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
      }
      await load()
    } finally {
      setBusy(false)
    }
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

      <h1 className="font-syne text-2xl font-bold text-white">
        {vaultName ?? 'Coffre'}
      </h1>

      {err ? (
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {err}
        </p>
      ) : null}

      {props.canEdit ? (
        <div className="mt-6 space-y-4 rounded-xl border border-white/10 bg-[#0d1f3c]/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-bt-cyan/90">Ajouter une entrée</p>
          <form onSubmit={addEntry} className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              placeholder="Libellé"
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
                  {t}
                </option>
              ))}
            </select>
            <input
              className="sm:col-span-2 rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              placeholder="Valeur"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <input
              className="sm:col-span-2 rounded-lg border border-white/10 bg-[#060d1a] px-3 py-2 text-sm text-white outline-none focus:border-bt-cyan/40"
              placeholder="Description (optionnel)"
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
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-3 py-2">Libellé</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Valeur</th>
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="px-3 py-2 text-white">{row.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-bt-cyan/90">{row.type}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 font-mono text-xs text-white/70">
                    {row.value}
                  </td>
                  <td className="px-3 py-2">
                    {props.canEdit ? (
                      <button
                        type="button"
                        onClick={() => deleteEntry(row.id)}
                        disabled={busy}
                        className="rounded p-1 text-red-400 hover:bg-red-500/10 disabled:opacity-40"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
