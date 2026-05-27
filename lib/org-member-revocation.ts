// lib/org-member-revocation.ts
// Révocation complète d'un membre d'organisation
// ============================================================

import { prisma } from '@/app/lib/db'

export type OrgMemberRevocationResult = {
  revokedCertificates: number
  removedTrustRelations: number
}

export async function revokeOrganizationMemberAccess(params: {
  organizationId: string
  targetUserId: string
  actorUserId: string
}): Promise<OrgMemberRevocationResult> {
  const { organizationId, targetUserId, actorUserId } = params
  let revokedCertificates = 0
  let removedTrustRelations = 0

  try {
    const orgMemberIds = await prisma.organizationMember
      .findMany({
        where: { organizationId, joinedAt: { not: null } },
        select: { userId: true },
      })
      .catch(() => [])

    const orgUserIds = orgMemberIds.map((m) => m.userId)

    const orgEntities = await prisma.entity
      .findMany({
        where: { organizationId, userId: targetUserId },
        select: { id: true, certificates: { select: { id: true, status: true } } },
      })
      .catch(() => [])

    const certIds = orgEntities.flatMap((e) =>
      e.certificates
        .filter((c) => ['ACTIVE', 'PENDING', 'ANCHORED'].includes(c.status))
        .map((c) => c.id),
    )

    if (certIds.length > 0) {
      const updated = await prisma.certificate
        .updateMany({
          where: { id: { in: certIds } },
          data: {
            status: 'REVOKED',
            revokedAt: new Date(),
            revocationReason: 'Membre retiré de l’organisation',
          },
        })
        .catch(() => ({ count: 0 }))
      revokedCertificates = updated.count
    }

    if (orgUserIds.length > 0) {
      const deleted = await prisma.userTrustRelation
        .deleteMany({
          where: {
            OR: [
              { fromUserId: targetUserId, toUserId: { in: orgUserIds } },
              { fromUserId: { in: orgUserIds }, toUserId: targetUserId },
            ],
          },
        })
        .catch(() => ({ count: 0 }))
      removedTrustRelations = deleted.count
    }

    await prisma.entity
      .updateMany({
        where: { organizationId, userId: targetUserId },
        data: { organizationId: null },
      })
      .catch(() => null)

    await prisma.auditLog
      .create({
        data: {
          action: 'ORG_MEMBER_REVOKED',
          resource: 'organization',
          resourceId: organizationId,
          userId: actorUserId,
          newValue: {
            targetUserId,
            revokedCertificates,
            removedTrustRelations,
          },
        },
      })
      .catch(() => null)
  } catch (err) {
    console.error('[org-member-revocation]', err)
  }

  return { revokedCertificates, removedTrustRelations }
}
