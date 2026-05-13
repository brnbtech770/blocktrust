// lib/whitelabel-access.ts
// Accès marque blanche / API publique — réservé Business & Enterprise
// ============================================================

import type { PlanType } from '@prisma/client'

/** Codes issus de `Subscription.plan` (webhook) ou variantes session. */
export const WHITELABEL_ALLOWED_PLAN_CODES = [
  'BUSINESS',
  'B2B_BUSINESS',
  'ENTERPRISE',
  'B2B_ENTERPRISE',
] as const

const ALLOWED = new Set<string>(WHITELABEL_ALLOWED_PLAN_CODES)

const ALLOWED_PLAN_TYPES = new Set<PlanType>(['B2B_BUSINESS', 'B2B_ENTERPRISE'])

/**
 * Accès UX / API White Label : plan d’abonnement autorisé ou type de plan Prisma Business+.
 */
export function userHasWhiteLabelAccess(args: {
  subscriptionPlan: string | null | undefined
  subscriptionStatus?: string | null | undefined
  userPlanType?: PlanType | null | undefined
}): boolean {
  const code = (args.subscriptionPlan ?? '').trim()
  if (ALLOWED.has(code)) {
    if (args.subscriptionStatus != null && args.subscriptionStatus !== 'active') {
      return false
    }
    return true
  }
  if (args.userPlanType && ALLOWED_PLAN_TYPES.has(args.userPlanType)) {
    return true
  }
  return false
}
