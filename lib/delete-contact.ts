import { prisma } from '@/app/lib/db'

const BLOCKING_CERTIFICATE_STATUSES = [
  'ACTIVE',
  'ANCHORED',
  'PENDING',
  'SUSPENDED',
] as const

function normalizeEmails(emails: string[]): string[] {
  return [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
}

/** Retire du Trust Circle les relations liées aux emails du contact. */
export async function removeTrustCircleLinksForEmails(
  userId: string,
  emails: string[],
): Promise<void> {
  const normalized = normalizeEmails(emails)
  if (normalized.length === 0) return

  const targetUsers = await prisma.user.findMany({
    where: {
      OR: normalized.map((email) => ({
        email: { equals: email, mode: 'insensitive' as const },
      })),
    },
    select: { id: true },
  })
  const targetUserIds = targetUsers.map((u) => u.id)

  const orFilters: Array<
    | { toEmail: { equals: string; mode: 'insensitive' } }
    | { toUserId: { in: string[] } }
  > = normalized.map((email) => ({
    toEmail: { equals: email, mode: 'insensitive' as const },
  }))
  if (targetUserIds.length > 0) {
    orFilters.push({ toUserId: { in: targetUserIds } })
  }

  await prisma.$transaction([
    prisma.userTrustRelation.deleteMany({
      where: { fromUserId: userId, OR: orFilters },
    }),
    ...(targetUserIds.length > 0
      ? [
          prisma.userTrustRelation.deleteMany({
            where: {
              toUserId: userId,
              fromUserId: { in: targetUserIds },
            },
          }),
        ]
      : []),
    prisma.userManualTrustEntry.deleteMany({
      where: {
        requestedBy: userId,
        OR: normalized.map((email) => ({
          entityEmail: { equals: email, mode: 'insensitive' as const },
        })),
      },
    }),
  ])
}

export type DeleteContactResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

/** Supprime un contact (Entity) appartenant à l'utilisateur (hard delete). */
export async function deleteUserContact(
  userId: string,
  entityId: string,
): Promise<DeleteContactResult> {
  const entity = await prisma.entity.findFirst({
    where: { id: entityId, userId },
    include: {
      certificates: { select: { id: true, status: true } },
    },
  })

  if (!entity) {
    return { ok: false, status: 404, error: 'Contact introuvable' }
  }

  const hasBlockingCertificate = entity.certificates.some((c) =>
    (BLOCKING_CERTIFICATE_STATUSES as readonly string[]).includes(c.status),
  )
  if (hasBlockingCertificate) {
    return {
      ok: false,
      status: 409,
      error:
        'Ce contact possède un certificat actif ou en cours de validation. Révoquez-le avant de supprimer le contact.',
    }
  }

  const relatedEmails = normalizeEmails([
    entity.email,
    ...entity.certifiedEmails,
  ])

  await removeTrustCircleLinksForEmails(userId, relatedEmails)
  await prisma.entity.delete({ where: { id: entity.id } })

  return { ok: true }
}
