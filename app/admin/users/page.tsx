// app/admin/users/page.tsx
// Liste de tous les utilisateurs avec leur plan et usage
// ============================================================

import { prisma } from '@/app/lib/db'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    include: {
      plan: true,
      entities: {
        include: {
          certificates: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="font-sans">
      <p className="mb-6 text-sm" style={{ color: 'var(--bt-muted)' }}>Liste de tous les clients</p>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'rgba(13,31,60,0.5)', borderColor: 'var(--bt-border)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--bt-border)' }}>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Email</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Nom</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Plan</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Entités</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Certificats</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Date inscription</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Statut</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const totalCertificates = user.entities.reduce(
                (sum, entity) => sum + entity.certificates.length,
                0
              )

              return (
                <tr key={user.id} className="transition-colors hover:bg-[rgba(0,212,255,0.04)]" style={{ borderTop: '1px solid var(--bt-border)' }}>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p style={{ color: 'var(--bt-muted)' }}>{user.name || '—'}</p>
                  </td>
                  <td className="px-6 py-4">
                    {user.plan ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' }}>
                        {user.plan.name}
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>Sans abonnement</span>
                    )}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--bt-muted)' }}>
                    {user.entities.length}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--bt-muted)' }}>
                    {totalCertificates}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={user.planId ? { background: 'rgba(29,184,126,0.15)', color: '#1DB87E' } : { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }}
                    >
                      {user.planId ? 'Actif' : 'Sans abonnement'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/users/${user.id}`} className="text-sm hover:underline" style={{ color: 'var(--bt-cyan)' }}>
                      Voir détail →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
