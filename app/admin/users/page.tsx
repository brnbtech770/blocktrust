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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Utilisateurs</h1>
        <p className="text-gray-400 text-sm">Liste de tous les clients</p>
      </div>

      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Email</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Nom</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Plan</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Entités</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Certificats</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Date inscription</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Statut</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const totalCertificates = user.entities.reduce(
                (sum, entity) => sum + entity.certificates.length,
                0
              )

              return (
                <tr key={user.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-400">{user.name || '—'}</p>
                  </td>
                  <td className="px-6 py-4">
                    {user.plan ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400">
                        {user.plan.name}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-sm">Sans abonnement</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {user.entities.length}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {totalCertificates}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      user.planId
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.planId ? 'Actif' : 'Sans abonnement'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-cyan-400 hover:text-cyan-300 text-sm"
                    >
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
