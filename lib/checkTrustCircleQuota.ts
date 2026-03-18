import { prisma } from '@/app/lib/db'
import {
  getQuotaForPlan,
  QUOTA_STATUSES,
  UPGRADE_THRESHOLD,
  getUpgradePlan,
  buildUpgradeMessage,
} from './trustCircleQuota'

export async function checkTrustCircleQuota(
  userId: string,
  plan: string
): Promise<{
  allowed:           boolean
  current:           number
  limit:             number | null
  percentage:        number
  shouldShowUpgrade: boolean
  upgradeMessage:    string | null
}> {
  const quota = getQuotaForPlan(plan)

  // Enterprise = illimité
  if (quota.poolTotal === null) {
    return {
      allowed:           true,
      current:           0,
      limit:             null,
      percentage:        0,
      shouldShowUpgrade: false,
      upgradeMessage:    null,
    }
  }

  // Compter UserTrustRelation actives (hors PENDING)
  const trustCount = await prisma.userTrustRelation.count({
    where: {
      fromUserId: userId,
      status: { in: QUOTA_STATUSES },
    },
  })

  // Compter UserManualTrustEntry actives
  const manualCount = await prisma.userManualTrustEntry.count({
    where: {
      requestedBy: userId,
      status: { in: ['ADMIN_VERIFIED', 'UNVERIFIED'] },
    },
  })

  const total      = trustCount + manualCount
  const limit      = quota.poolTotal
  const percentage = total / limit
  const allowed    = total < limit

  const upgradePlan    = getUpgradePlan(plan)
  const upgradeMessage = percentage >= UPGRADE_THRESHOLD
    ? buildUpgradeMessage(plan, upgradePlan, total, limit)
    : null

  return {
    allowed,
    current:           total,
    limit,
    percentage:        Math.round(percentage * 100) / 100,
    shouldShowUpgrade: percentage >= UPGRADE_THRESHOLD,
    upgradeMessage,
  }
}
