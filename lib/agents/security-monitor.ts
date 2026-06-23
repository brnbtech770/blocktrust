// lib/agents/security-monitor.ts
// Agent Sécurité — rate limit extension, connexions échouées, clés API, KYC rejeté
// ============================================================

import { prisma } from '@/app/lib/db'
import {
  createSecurityAdminAlert,
  recentAgentAlertExists,
  writeAgentAuditLog,
} from '@/lib/agents/agent-utils'
import { recordGracePeriodSkip, shouldSkipAlertForNewAccount } from '@/lib/alert-grace-period'

const AGENT_META = { source: 'security-monitor' } as const

export type SecurityMonitorResult = {
  extensionRateAlerts: number
  authFailedAlerts: number
  apiKeyAlerts: number
  kycRetryAlerts: number
  graceSkipped: number
}

export async function runSecurityMonitor(): Promise<SecurityMonitorResult> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  let extensionRateAlerts = 0
  let authFailedAlerts = 0
  let apiKeyAlerts = 0
  let kycRetryAlerts = 0
  let graceSkipped = 0

  // Rate limit extension dépassé (> 100/min par identifiant)
  const extensionRateLogs = await prisma.auditLog.groupBy({
    by: ['resourceId'],
    where: {
      action: 'EXTENSION_RATE_LIMIT',
      createdAt: { gte: oneHourAgo },
      resourceId: { not: null },
    },
    _count: { id: true },
    having: { id: { _count: { gt: 5 } } },
  })

  for (const row of extensionRateLogs) {
    const resourceId = row.resourceId
    if (!resourceId) continue

    const dup = await recentAgentAlertExists(
      'SECURITY',
      { path: ['resourceId'], equals: resourceId },
      oneHourAgo,
    )
    if (dup) continue

    await createSecurityAdminAlert({
      title: 'Alerte sécurité',
      description: `Rate limit extension dépassé : ${row._count.id} hits en 1h (identifiant ${resourceId.slice(0, 12)}…)`,
      metadata: {
        ...AGENT_META,
        rule: 'extension_rate_limit',
        resourceId,
        count: row._count.id,
      },
    })
    extensionRateAlerts += 1
  }

  // Tentatives de connexion échouées > 5 en 1h (par ipHash ou email hash)
  const authFailedLogs = await prisma.auditLog.groupBy({
    by: ['ipHash'],
    where: {
      action: 'AUTH_SIGNIN_FAILED',
      createdAt: { gte: oneHourAgo },
      ipHash: { not: null },
    },
    _count: { id: true },
    having: { id: { _count: { gt: 5 } } },
  })

  for (const row of authFailedLogs) {
    const ipHash = row.ipHash
    if (!ipHash) continue

    const dup = await recentAgentAlertExists(
      'SECURITY',
      { path: ['ipHash'], equals: ipHash },
      oneHourAgo,
    )
    if (dup) continue

    await createSecurityAdminAlert({
      title: 'Alerte sécurité',
      description: `${row._count.id} tentatives de connexion échouées en 1h depuis la même source`,
      metadata: {
        ...AGENT_META,
        rule: 'auth_signin_failed',
        ipHash,
        count: row._count.id,
      },
    })
    authFailedAlerts += 1
  }

  // Nouvelles clés API extension (bt_ext_)
  const apiKeyLogs = await prisma.auditLog.findMany({
    where: {
      action: 'EXTENSION_API_KEY_CREATED',
      createdAt: { gte: oneHourAgo },
    },
    select: { id: true, userId: true, resourceId: true, createdAt: true },
    take: 20,
  })

  for (const log of apiKeyLogs) {
    if (!log.userId) continue
    const dup = await recentAgentAlertExists(
      'SECURITY',
      { path: ['auditLogId'], equals: log.id },
      oneHourAgo,
    )
    if (dup) continue

    const user = await prisma.user.findUnique({
      where: { id: log.userId },
      select: { id: true, createdAt: true },
    })
    if (
      user &&
      shouldSkipAlertForNewAccount(user, 'SECURITY', {
        metadata: { rule: 'extension_api_key_created' },
      })
    ) {
      await recordGracePeriodSkip({
        userId: user.id,
        alertType: 'SECURITY',
        rule: 'extension_api_key_created',
      })
      graceSkipped += 1
      continue
    }

    await createSecurityAdminAlert({
      title: 'Alerte sécurité',
      description: `Nouvelle clé API extension créée pour l'utilisateur ${log.userId.slice(0, 8)}…`,
      userId: log.userId,
      metadata: {
        ...AGENT_META,
        rule: 'extension_api_key_created',
        auditLogId: log.id,
        userId: log.userId,
      },
      notifyTeam: false,
    })
    apiKeyAlerts += 1
  }

  // Utilisateur KYC REJECTED qui retente
  const kycRetries = await prisma.kYCVerification.findMany({
    where: {
      createdAt: { gte: oneHourAgo },
      status: 'PENDING',
      user: { kycStatus: 'REJECTED' },
    },
    select: {
      id: true,
      userId: true,
      user: { select: { email: true } },
    },
    take: 20,
  })

  for (const kyc of kycRetries) {
    const dup = await recentAgentAlertExists(
      'SECURITY',
      { path: ['kycVerificationId'], equals: kyc.id },
      oneHourAgo,
    )
    if (dup) continue

    await createSecurityAdminAlert({
      title: 'Alerte sécurité',
      description: `Tentative de vérification d'identité après rejet (utilisateur ${kyc.userId.slice(0, 8)}…)`,
      userId: kyc.userId,
      metadata: {
        ...AGENT_META,
        rule: 'kyc_rejected_retry',
        kycVerificationId: kyc.id,
        userId: kyc.userId,
      },
    })
    kycRetryAlerts += 1
  }

  await writeAgentAuditLog('SECURITY_MONITOR_RUN', 'security-monitor', {
    extensionRateAlerts,
    authFailedAlerts,
    apiKeyAlerts,
    kycRetryAlerts,
    graceSkipped,
  })

  return {
    extensionRateAlerts,
    authFailedAlerts,
    apiKeyAlerts,
    kycRetryAlerts,
    graceSkipped,
  }
}
