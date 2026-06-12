// app/admin/dashboard/AdminInternalTeamSection.tsx
// Équipe BLOCKTRUST — visible super admin uniquement
// ============================================================

import { fetchInternalTeamMembers } from '@/lib/internal-team'
import { Circle } from 'lucide-react'

function formatDateFr(d: Date | null): string {
  if (!d || d.getTime() <= 0) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTimeFr(d: Date | null): string {
  if (!d) return 'Jamais'
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminInternalTeamSection() {
  const members = await fetchInternalTeamMembers()

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30">
      <h2 className="font-syne mb-1 text-xl font-semibold tracking-tight text-white">
        Équipe BLOCKTRUST
      </h2>
      <p className="mb-5 text-sm text-white/50">
        État de connexion des comptes internes (visible super admin uniquement).
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/45">
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">Rôle</th>
              <th className="pb-3 pr-4 font-medium">Statut</th>
              <th className="pb-3 pr-4 font-medium">Dernière connexion</th>
              <th className="pb-3 font-medium">Inscription</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.email} className="border-b border-white/5 last:border-0">
                <td className="py-3 pr-4 font-mono text-xs text-white/90">{m.email}</td>
                <td className="py-3 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      m.role === 'Admin'
                        ? 'bg-bt-cyan/15 text-bt-cyan'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {m.role}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <Circle
                      className={`h-2 w-2 fill-current ${
                        m.status === 'En ligne' ? 'text-emerald-400' : 'text-white/30'
                      }`}
                      aria-hidden
                    />
                    <span className={m.status === 'En ligne' ? 'text-emerald-400' : 'text-white/50'}>
                      {m.status}
                    </span>
                  </span>
                </td>
                <td className="py-3 pr-4 text-xs text-white/70">
                  {formatDateTimeFr(m.lastLoginAt)}
                </td>
                <td className="py-3 text-xs text-white/70">
                  {m.registered ? formatDateFr(m.createdAt) : (
                    <span className="text-amber-400/90">Non inscrit</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
