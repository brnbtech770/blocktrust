// app/admin/users/page.tsx
// Liste de tous les utilisateurs avec leur plan et usage
// ============================================================

import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { isAdmin, isSuperAdmin } from '@/lib/admin-utils'
import { isActiveBillingStatus } from '@/lib/plan-features'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import AdminUsersTable from '@/app/admin/users/AdminUsersTable'
import { isSuspectUserForAdmin } from '@/lib/register-anti-bot'
import { adminUserListSelect } from '@/lib/prisma-admin-user'

export default async function AdminUsersPage() {
  await requireAdminPage()
  const session = await auth()

  const users = await prisma.user.findMany({
    select: adminUserListSelect,
    orderBy: { createdAt: 'desc' },
  })

  const rows = users.map((user) => {
    const totalCertificates = user.entities.reduce(
      (sum, entity) => sum + entity._count.certificates,
      0
    )
    const sub = user.subscription
    const hasActiveSubscription = Boolean(
      sub?.stripeSubscriptionId && isActiveBillingStatus(sub.status),
    )
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      trustScore: user.trustScore,
      planName: user.plan?.name ?? null,
      entitiesCount: user.entities.length,
      certificatesCount: totalCertificates,
      createdAtLabel: new Date(user.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      hasActivePlan: Boolean(user.planId),
      hasActiveSubscription,
      isAdminUser: isAdmin(user.email),
      isSuspect: isSuspectUserForAdmin(user.name, Boolean(user.planId)),
    }
  })

  return (
    <AdminUsersTable
      users={rows}
      canDeleteAdmins={isSuperAdmin(session?.user?.email)}
      currentAdminEmail={session?.user?.email ?? ''}
    />
  )
}
