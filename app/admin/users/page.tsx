// app/admin/users/page.tsx
// Liste de tous les utilisateurs avec leur plan et usage
// ============================================================

import { prisma } from '@/app/lib/db'
import { isAdmin } from '@/app/lib/admin'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import AdminUsersTable from '@/app/admin/users/AdminUsersTable'
import { isSuspectUserForAdmin } from '@/lib/register-anti-bot'
import { adminUserListSelect } from '@/lib/prisma-admin-user'

export default async function AdminUsersPage() {
  await requireAdminPage()

  const users = await prisma.user.findMany({
    select: adminUserListSelect,
    orderBy: { createdAt: 'desc' },
  })

  const rows = users.map((user) => {
    const totalCertificates = user.entities.reduce(
      (sum, entity) => sum + entity._count.certificates,
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
      isSuspect: isSuspectUserForAdmin(user.name, Boolean(user.planId)),
    }
  })

  return <AdminUsersTable users={rows} />
}
