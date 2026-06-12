// lib/internal-kyc-verified.ts
// KYC VERIFIED + niveau Enterprise pour comptes internes (admins + Johanna) — idempotent
// ============================================================

import { prisma } from '@/app/lib/db'
import { getAllInternalEmails, getAdminEmailList } from '@/lib/admin-utils'
import type { ValidationLevel } from '@prisma/client'

/** Niveau certificat des comptes internes (Enterprise). */
export const INTERNAL_ACCOUNT_VALIDATION_LEVEL: ValidationLevel = 'ENTERPRISE'

/** Liste canonique admins — alignée avec ADMIN_EMAILS (Vercel) et scripts/bootstrap-all-admins.ts */
export const CANONICAL_ADMIN_KYC_EMAILS = [
  'brnbtech@gmail.com',
  'laurianne@winter-keys.com',
  'deborahbernabe@gmail.com',
  'shai270202@gmail.com',
  'brnbimmo@gmail.com',
  'contact@brnb.fr',
  'bernabeshai56@gmail.com',
] as const

export type InternalKycSyncResult = 'updated' | 'already_verified' | 'not_found'

export type InternalKycSyncDetail = {
  result: InternalKycSyncResult
  userUpdated: boolean
  entitiesUpdated: number
}

/** Emails cibles : tous les comptes internes (9 emails canoniques). */
export function getInternalKycEmailList(): string[] {
  const fromEnv = getAdminEmailList()
  if (fromEnv.length > 0) {
    return [...new Set([...fromEnv, ...getAllInternalEmails()])]
  }
  return [...getAllInternalEmails()]
}

/**
 * Met User.kycStatus = VERIFIED et toutes les Entity en VERIFIED + Enterprise.
 * Idempotent : ne modifie que ce qui n'est pas déjà conforme.
 */
export async function syncInternalAccountKycByUserId(
  userId: string
): Promise<InternalKycSyncDetail> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      kycStatus: true,
      kycVerifiedAt: true,
      entities: {
        select: { id: true, kycStatus: true, validationLevel: true },
      },
    },
  })

  if (!user) {
    return { result: 'not_found', userUpdated: false, entitiesUpdated: 0 }
  }

  const userNeedsUpdate = user.kycStatus !== 'VERIFIED'
  const entitiesToUpdate = user.entities.filter(
    (e) =>
      e.kycStatus !== 'VERIFIED' ||
      e.validationLevel !== INTERNAL_ACCOUNT_VALIDATION_LEVEL
  )

  if (!userNeedsUpdate && entitiesToUpdate.length === 0) {
    return { result: 'already_verified', userUpdated: false, entitiesUpdated: 0 }
  }

  if (userNeedsUpdate) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        kycStatus: 'VERIFIED',
        kycVerifiedAt: user.kycVerifiedAt ?? new Date(),
        kycRejectedAt: null,
        kycRejectedReason: null,
      },
    })
  }

  if (entitiesToUpdate.length > 0) {
    await prisma.entity.updateMany({
      where: {
        userId: user.id,
        OR: [
          { kycStatus: { not: 'VERIFIED' } },
          { validationLevel: { not: INTERNAL_ACCOUNT_VALIDATION_LEVEL } },
        ],
      },
      data: {
        kycStatus: 'VERIFIED',
        validationLevel: INTERNAL_ACCOUNT_VALIDATION_LEVEL,
        emailVerified: true,
      },
    })
  }

  return {
    result: 'updated',
    userUpdated: userNeedsUpdate,
    entitiesUpdated: entitiesToUpdate.length,
  }
}

/** Sync par email (case-insensitive). */
export async function syncInternalAccountKycByEmail(
  email: string
): Promise<InternalKycSyncDetail> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: 'insensitive' } },
    select: { id: true },
  })

  if (!user) {
    return { result: 'not_found', userUpdated: false, entitiesUpdated: 0 }
  }

  return syncInternalAccountKycByUserId(user.id)
}
