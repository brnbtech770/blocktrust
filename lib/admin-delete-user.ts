// lib/admin-delete-user.ts
// Suppression complète d’un utilisateur (hors admins) en transaction
// ============================================================

import { prisma } from '@/app/lib/db'
import type { Prisma } from '@prisma/client'

export async function deleteAdminUserTransaction(
  userId: string,
  tx: Prisma.TransactionClient
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  })
  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  const entityRows = await tx.entity.findMany({
    where: { userId },
    select: { id: true },
  })
  const entityIds = entityRows.map((e) => e.id)

  if (entityIds.length > 0) {
    await tx.aIAlert.deleteMany({
      where: { entityId: { in: entityIds } },
    })
    await tx.adminAlert.deleteMany({
      where: { entityId: { in: entityIds } },
    })
  }

  await tx.organizationMember.deleteMany({ where: { userId } })

  const ownedOrgs = await tx.organization.findMany({
    where: { ownerId: userId },
    select: { id: true },
  })
  for (const org of ownedOrgs) {
    await tx.entity.deleteMany({ where: { organizationId: org.id } })
    await tx.organizationMember.deleteMany({ where: { organizationId: org.id } })
    await tx.organization.delete({ where: { id: org.id } })
  }

  const ownedPersonal = await tx.personalAccount.findMany({
    where: { ownerId: userId },
    select: { id: true },
  })
  for (const pa of ownedPersonal) {
    await tx.personalAccountMember.deleteMany({
      where: { personalAccountId: pa.id },
    })
    await tx.personalAccount.delete({ where: { id: pa.id } })
  }

  await tx.personalAccountMember.deleteMany({ where: { userId } })

  await tx.adminAlert.deleteMany({ where: { userId } })

  await tx.whiteLabelConfig.deleteMany({ where: { userId } })

  await tx.kYCVerification.deleteMany({ where: { userId } })

  await tx.account.deleteMany({ where: { userId } })
  await tx.session.deleteMany({ where: { userId } })

  await tx.userDevice.deleteMany({ where: { userId } })

  await tx.userTrustRelation.deleteMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
  })

  await tx.entity.deleteMany({ where: { userId } })

  await tx.subscription.deleteMany({ where: { userId } })

  if (user.email) {
    await tx.passwordReset.deleteMany({ where: { email: user.email } })
  }

  await tx.auditLog.deleteMany({ where: { userId } })

  await tx.user.delete({ where: { id: userId } })
}

/** Suppression complète hors transaction (ex. script one-shot). */
export async function deleteUserAdmin(userId: string) {
  await prisma.$transaction((tx) => deleteAdminUserTransaction(userId, tx))
}
