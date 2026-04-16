// app/admin/users/page.tsx
// Liste de tous les utilisateurs avec leur plan et usage
// ============================================================

import { prisma } from '@/app/lib/db'
import { isAdmin } from '@/app/lib/admin'
import AdminUsersTable from '@/app/admin/users/AdminUsersTable'

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

  const rows = users.map((user) => {
    const totalCertificates = user.entities.reduce(
      (sum, entity) => sum + entity.certificates.length,
      0
    )
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      planName: user.plan?.name ?? null,
      entitiesCount: user.entities.length,
      certificatesCount: totalCertificates,
      createdAtLabel: new Date(user.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      hasActivePlan: Boolean(user.planId),
      isAdminUser: isAdmin(user.email),
    }
  })

  return <AdminUsersTable users={rows} />
}
