'use client'

// app/admin/users/AdminUsersTable.tsx
// Table utilisateurs avec suppression (modal)
// ============================================================

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'

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
}

export default function AdminUsersTable({ users: initialUsers }: { users: AdminUserRow[] }) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [confirmUser, setConfirmUser] = useState<AdminUserRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

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
    setConfirmUser(null)
    setToast(`Utilisateur ${confirmUser.email ?? confirmUser.id} supprimé.`)
    startTransition(() => router.refresh())
    window.setTimeout(() => setToast(null), 5000)
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

      <p className="mb-6 text-sm" style={{ color: 'var(--bt-muted)' }}>
        Liste de tous les clients
      </p>

      <div
        className="overflow-hidden rounded-xl border"
        style={{ background: 'rgba(13,31,60,0.5)', borderColor: 'var(--bt-border)' }}
      >
        <table className="w-full">
          <thead>
            <tr
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderBottom: '1px solid var(--bt-border)',
              }}
            >
              <th
                className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-mono-bt), monospace',
                  color: 'var(--bt-muted)',
                }}
              >
                Email
              </th>
              <th
                className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-mono-bt), monospace',
                  color: 'var(--bt-muted)',
                }}
              >
                Nom
              </th>
              <th
                className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-mono-bt), monospace',
                  color: 'var(--bt-muted)',
                }}
              >
                Plan
              </th>
              <th
                className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-mono-bt), monospace',
                  color: 'var(--bt-muted)',
                }}
              >
                Entités
              </th>
              <th
                className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-mono-bt), monospace',
                  color: 'var(--bt-muted)',
                }}
              >
                Certificats
              </th>
              <th
                className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-mono-bt), monospace',
                  color: 'var(--bt-muted)',
                }}
              >
                Date inscription
              </th>
              <th
                className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-mono-bt), monospace',
                  color: 'var(--bt-muted)',
                }}
              >
                Statut
              </th>
              <th
                className="px-6 py-4 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{
                  fontFamily: 'var(--font-mono-bt), monospace',
                  color: 'var(--bt-muted)',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="transition-colors hover:bg-[rgba(0,212,255,0.04)]"
                style={{ borderTop: '1px solid var(--bt-border)' }}
              >
                <td className="px-6 py-4">
                  <p className="font-medium text-white">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  <p style={{ color: 'var(--bt-muted)' }}>{user.name || '—'}</p>
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
                  <span
                    className="rounded-full px-3 py-1 text-xs font-bold"
                    style={
                      user.hasActivePlan
                        ? { background: 'rgba(29,184,126,0.15)', color: '#1DB87E' }
                        : { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }
                    }
                  >
                    {user.hasActivePlan ? 'Actif' : 'Sans abonnement'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-sm hover:underline"
                      style={{ color: 'var(--bt-cyan)' }}
                    >
                      Voir détail →
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
