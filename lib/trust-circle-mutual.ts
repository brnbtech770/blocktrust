import { prisma } from '@/app/lib/db'
import { persistUserTrustScore } from '@/lib/trustscore'

type TrustRelationRow = {
  id: string
  fromUserId: string
  toUserId: string | null
  status: string
  isMutual: boolean
}

/** Relation inverse existante (PENDING ou CONFIRMED) → promotion mutuelle possible. */
export function canPromoteToMutual(
  reverse: Pick<TrustRelationRow, 'status' | 'isMutual'> | null | undefined,
): boolean {
  if (!reverse || reverse.isMutual) return false
  return reverse.status === 'CONFIRMED' || reverse.status === 'PENDING'
}

/** Promeut deux relations réciproques en MUTUAL / CONFIRMED. */
export async function promoteToMutual(
  relationId: string,
  reverseId: string,
): Promise<void> {
  const now = new Date()
  await prisma.$transaction([
    prisma.userTrustRelation.update({
      where: { id: relationId },
      data: {
        isMutual: true,
        trustType: 'MUTUAL',
        status: 'CONFIRMED',
        confirmedAt: now,
      },
    }),
    prisma.userTrustRelation.update({
      where: { id: reverseId },
      data: {
        isMutual: true,
        trustType: 'MUTUAL',
        status: 'CONFIRMED',
        confirmedAt: now,
      },
    }),
  ])
}

/** Répare les paires réciproques non marquées MUTUAL (données existantes). */
export async function syncMutualRelationsForUser(userId: string): Promise<number> {
  const outgoing = await prisma.userTrustRelation.findMany({
    where: {
      fromUserId: userId,
      toUserId: { not: null },
      isMutual: false,
    },
    select: { id: true, toUserId: true },
  })

  let fixed = 0
  for (const rel of outgoing) {
    if (!rel.toUserId) continue
    const reverse = await prisma.userTrustRelation.findFirst({
      where: { fromUserId: rel.toUserId, toUserId: userId },
      select: { id: true, status: true, isMutual: true },
    })
    if (!canPromoteToMutual(reverse)) continue
    await promoteToMutual(rel.id, reverse!.id)
    await persistUserTrustScore(userId)
    await persistUserTrustScore(rel.toUserId)
    fixed++
  }
  return fixed
}

/** Cherche la relation inverse et promeut en MUTUAL si applicable. */
export async function tryPromoteMutualOnAdd(params: {
  relationId: string
  fromUserId: string
  toUserId: string
}): Promise<boolean> {
  const reverse = await prisma.userTrustRelation.findFirst({
    where: {
      fromUserId: params.toUserId,
      toUserId: params.fromUserId,
    },
    select: { id: true, status: true, isMutual: true },
  })

  if (!canPromoteToMutual(reverse)) return false

  await promoteToMutual(params.relationId, reverse!.id)
  await persistUserTrustScore(params.fromUserId)
  await persistUserTrustScore(params.toUserId)
  return true
}
