'use client'

// app/admin/users/AdminUsersTable.tsx
// Table utilisateurs avec suppression (modal)
// ============================================================

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, useRef, useEffect } from 'react'
import { Trash2, ArrowRight, UserPlus, Download } from 'lucide-react'
import StatusBadge from '@/app/components/admin/StatusBadge'

export type AdminUserRow = {
  id: string
  email: string | null
  name: string | null
  planName: string | null
  entitiesCount: number
  certificatesCount: number
  createdAtLabel: string
  hasActivePlan: boolean
  isAdminUser: boolean
  isSuspect: boolean
}

export default function AdminUsersTable({ users: initialUsers }: { users: AdminUserRow[] }) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [confirmUser, setConfirmUser] = useState<AdminUserRow | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [error, setError] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [bulkPending, setBulkPending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [creatingTest, setCreatingTest] = useState(false)

  const selectableUsers = users.filter((u) => !u.isAdminUser)
  const selectedBulkTargets = selectableUsers.filter((u) => selectedIds.has(u.id))
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = selectAllCheckboxRef.current
    if (!el) return
    const n = selectableUsers.length
    const sel = selectedBulkTargets.length
    el.indeterminate = n > 0 && sel > 0 && sel < n
  }, [selectableUsers.length, selectedBulkTargets.length])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(() => {
      if (!checked) return new Set()
      return new Set(selectableUsers.map((u) => u.id))
    })
  }

  async function confirmBulkDelete() {
    const ids = selectedBulkTargets.map((u) => u.id)
    if (ids.length === 0) return
    setBulkError(null)
    setBulkPending(true)
    try {
      const res = await fetch('/api/admin/users/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBulkError(typeof data.error === 'string' ? data.error : 'Suppression impossible')
        setBulkPending(false)
        return
      }
      const deletedIds: string[] = Array.isArray(data.deletedIds) ? data.deletedIds : []
      setUsers((prev) => prev.filter((u) => !deletedIds.includes(u.id)))
      setSelectedIds(new Set())
      setBulkConfirm(false)
      const errList: string[] = Array.isArray(data.errors) ? data.errors : []
      setToast(
        errList.length > 0
          ? `${deletedIds.length} supprimé(s). ${errList.length} erreur(s).`
          : `${deletedIds.length} utilisateur(s) supprimé(s).`
      )
      startTransition(() => router.refresh())
      window.setTimeout(() => setToast(null), 6000)
    } catch {
      setBulkError('Erreur réseau')
    } finally {
      setBulkPending(false)
    }
  }

  async function confirmDelete() {
    if (!confirmUser) return
    setError(null)
    const res = await fetch(`/api/admin/users/${confirmUser.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Suppression impossible')
      return
    }
    setUsers((prev) => prev.filter((u) => u.id !== confirmUser.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(confirmUser.id)
      return next
    })
    setConfirmUser(null)
    setToast(`Utilisateur ${confirmUser.email ?? confirmUser.id} supprimé.`)
    startTransition(() => router.refresh())
    window.setTimeout(() => setToast(null), 5000)
  }

  async function createTestUser() {
    setCreatingTest(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setToast(typeof data.error === 'string' ? data.error : 'Création impossible')
        return
      }
      setToast(`Utilisateur test créé : ${data.user?.email ?? 'OK'}`)
      startTransition(() => router.refresh())
    } catch {
      setToast('Erreur réseau')
    } finally {
      setCreatingTest(false)
      window.setTimeout(() => setToast(null), 6000)
    }
  }

  function exportCsv() {
    const header = ['id', 'email', 'name', 'plan', 'entities', 'certificates', 'createdAt', 'status']
    const lines = users.map((u) =>
      [
        u.id,
        u.email ?? '',
        u.name ?? '',
        u.planName ?? '',
        String(u.entitiesCount),
        String(u.certificatesCount),
        u.createdAtLabel,
        u.hasActivePlan ? 'ACTIVE' : 'INACTIVE',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blocktrust-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="font-sans">
      {toast && (
        <div
          className="mb-4 rounded-lg border px-4 py-3 text-sm"
          style={{
            background: 'rgba(29,184,126,0.12)',
            borderColor: 'rgba(29,184,126,0.35)',
            color: '#1DB87E',
          }}
          role="status"
        >
          {toast}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
          Liste de tous les utilisateurs
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createTestUser}
            disabled={creatingTest}
            className="inline-flex items-center gap-2 rounded-lg border border-bt-cyan/40 bg-bt-cyan/10 px-3 py-2 text-xs font-semibold text-bt-cyan transition hover:bg-bt-cyan/20 disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            {creatingTest ? 'Création…' : 'Nouveau utilisateur test'}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Exporter CSV
          </button>
        </div>
      </div>

      {selectedBulkTargets.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setBulkError(null)
              setBulkConfirm(true)
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition"
            style={{ background: '#b91c1c' }}
          >
            Supprimer la sélection ({selectedBulkTargets.length})
          </button>
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="w-10 border-b border-white/5 px-4 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">
                <input
                  ref={selectAllCheckboxRef}
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-transparent"
                  aria-label="Tout sélectionner (hors admins)"
                  checked={
                    selectableUsers.length > 0 &&
                    selectableUsers.every((u) => selectedIds.has(u.id))
                  }
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>
              <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">Email</th>
              <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">Nom</th>
              <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">Plan</th>
              <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">Entités</th>
              <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">Certificats</th>
              <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">Date inscription</th>
              <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">Statut</th>
              <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-white/5 transition-all hover:bg-white/[0.02]"
              >
                <td className="px-4 py-4 align-middle">
                  {!user.isAdminUser ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-transparent"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      aria-label={`Sélectionner ${user.email ?? user.id}`}
                    />
                  ) : (
                    <span className="inline-block w-4" aria-hidden />
                  )}
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-white">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p style={{ color: 'var(--bt-muted)' }}>{user.name || '—'}</p>
                    {user.isSuspect && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          background: 'rgba(234,179,8,0.15)',
                          color: '#facc15',
                        }}
                        title="Sans abonnement et segment de nom long sans espace"
                      >
                        🤖 Suspect
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.planName ? (
                    <span
                      className="rounded-full px-3 py-1 text-xs font-bold"
                      style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' }}
                    >
                      {user.planName}
                    </span>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>
                      Sans abonnement
                    </span>
                  )}
                </td>
                <td className="px-6 py-4" style={{ color: 'var(--bt-muted)' }}>
                  {user.entitiesCount}
                </td>
                <td className="px-6 py-4" style={{ color: 'var(--bt-muted)' }}>
                  {user.certificatesCount}
                </td>
                <td
                  className="px-6 py-4 text-sm"
                  style={{
                    color: 'var(--bt-muted)',
                    fontFamily: 'var(--font-mono-bt), monospace',
                  }}
                >
                  {user.createdAtLabel}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge
                    status={user.hasActivePlan ? 'ACTIVE' : 'INACTIVE'}
                    type="user"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="inline-flex items-center gap-1 font-sans text-xs text-white/40 transition-all hover:text-bt-cyan"
                    >
                      Détails
                      <ArrowRight size={12} aria-hidden />
                    </Link>
                    {!user.isAdminUser && (
                      <button
                        type="button"
                        onClick={() => setConfirmUser(user)}
                        className="rounded p-2 transition hover:bg-red-500/10"
                        style={{ color: '#e05252' }}
                        title="Supprimer l’utilisateur"
                        aria-label={`Supprimer ${user.email ?? user.id}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bulkConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
        >
          <div
            className="max-w-md rounded-xl border p-6 shadow-xl"
            style={{
              background: 'var(--bt-navy)',
              borderColor: 'var(--bt-border)',
            }}
          >
            <h2 id="bulk-delete-title" className="font-syne text-lg font-bold text-white">
              Supprimer {selectedBulkTargets.length} utilisateur(s) ?
            </h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--bt-muted)' }}>
              Action irréversible pour chaque compte sélectionné (hors comptes admin, qui ne sont pas
              listés).
            </p>
            {bulkError && (
              <p className="mt-3 text-sm" style={{ color: 'var(--bt-danger, #e05252)' }}>
                {bulkError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setBulkConfirm(false)
                  setBulkError(null)
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium transition"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--bt-muted)',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                disabled={bulkPending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                style={{ background: '#b91c1c' }}
              >
                {bulkPending ? 'Suppression…' : 'Supprimer la sélection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-title"
        >
          <div
            className="max-w-md rounded-xl border p-6 shadow-xl"
            style={{
              background: 'var(--bt-navy)',
              borderColor: 'var(--bt-border)',
            }}
          >
            <h2 id="delete-user-title" className="font-syne text-lg font-bold text-white">
              Supprimer {confirmUser.email ?? 'cet utilisateur'} ?
            </h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--bt-muted)' }}>
              Cette action est irréversible. Tous ses certificats, entités et données seront
              supprimés.
            </p>
            {error && (
              <p className="mt-3 text-sm" style={{ color: 'var(--bt-danger, #e05252)' }}>
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmUser(null)
                  setError(null)
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium transition"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--bt-muted)',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                style={{ background: '#b91c1c' }}
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
