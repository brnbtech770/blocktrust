// Recalcul batch du TrustScore utilisateur (cron / abonnés actifs).
// ============================================================

import { prisma } from '@/app/lib/db'
import { persistUserTrustScore } from '@/lib/trustscore'

export async function runTrustScoreUpdate() {
  const activeUsers = await prisma.user.findMany({
    where: { subscription: { status: 'active' } },
    select: { id: true },
  })

  for (const user of activeUsers) {
    await persistUserTrustScore(user.id)
  }

  return { updated: activeUsers.length }
}
