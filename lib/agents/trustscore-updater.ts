// Recalcul batch du TrustScore utilisateur (cron / abonnés actifs + comptes officiels).
// ============================================================

import { prisma } from '@/app/lib/db'
import { getInternalEmailList } from '@/lib/admin-utils'
import { persistUserTrustScore } from '@/lib/trustscore'

export async function runTrustScoreUpdate() {
  const internalEmails = getInternalEmailList()

  const activeUsers = await prisma.user.findMany({
    where: {
      OR: [
        { subscription: { status: { in: ['active', 'trialing'] } } },
        ...(internalEmails.length > 0
          ? [
              {
                email: {
                  in: internalEmails,
                  mode: 'insensitive' as const,
                },
              },
            ]
          : []),
      ],
    },
    select: { id: true },
  })

  for (const user of activeUsers) {
    await persistUserTrustScore(user.id)
  }

  return { updated: activeUsers.length }
}
