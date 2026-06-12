// lib/admin-update-user-plan.ts
// Mise à jour manuelle du plan utilisateur (admin)
// ============================================================

import { prisma } from '@/app/lib/db'
import { normalizePlanKey } from '@/lib/plan-wording'
import {
  ADMIN_ASSIGNABLE_PLAN_CODES,
  type AdminAssignablePlanCode,
} from '@/lib/pricing'
import type { PlanType } from '@prisma/client'

export const VALID_PLAN_CODES = ADMIN_ASSIGNABLE_PLAN_CODES

export type AdminPlanCode = AdminAssignablePlanCode

export function isValidAdminPlanCode(code: string): code is AdminPlanCode {
  return (VALID_PLAN_CODES as readonly string[]).includes(code)
}

function subscriptionPlanCode(planCode: string): string {
  const normalized = normalizePlanKey(planCode)
  if (normalized.startsWith('B2C_')) return normalized.replace('B2C_', '')
  if (normalized.startsWith('B2B_')) return normalized.replace('B2B_', '')
  return planCode
}

export async function updateUserPlanAdmin(userId: string, planCode: AdminPlanCode): Promise<void> {
  const planType = normalizePlanKey(planCode) as PlanType

  const plan = await prisma.plan.findFirst({
    where: { type: planType, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  if (!plan) {
    throw new Error(`Plan introuvable pour le code ${planCode}`)
  }

  const subPlan = subscriptionPlanCode(planCode)

  await prisma.user.update({
    where: { id: userId },
    data: { planId: plan.id },
  })

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: subPlan,
      status: 'active',
    },
    update: {
      plan: subPlan,
      status: 'active',
    },
  })
}
