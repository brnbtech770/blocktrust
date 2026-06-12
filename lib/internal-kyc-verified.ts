// lib/internal-kyc-verified.ts
// KYC VERIFIED + niveau Enterprise pour comptes internes (9 emails) — idempotent
// ============================================================

import { prisma } from '@/app/lib/db'
import { getAllInternalEmails } from '@/lib/admin-utils'
import type { ValidationLevel } from '@prisma/client'

/** Niveau certificat des comptes internes (Enterprise). */
export const INTERNAL_ACCOUNT_VALIDATION_LEVEL: ValidationLevel = 'ENTERPRISE'

let cachedInternalValidationLevel: string | null = null

/** ENTERPRISE si enum migré, sinon GOLD (legacy BRONZE/SILVER/GOLD/PLATINUM). */
async function resolveInternalValidationLevel(): Promise<string> {
  if (cachedInternalValidationLevel) return cachedInternalValidationLevel
  const rows = await prisma.$queryRaw<{ enumlabel: string }[]>`
    SELECT enumlabel FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ValidationLevel'
  `
  const labels = new Set(rows.map((r) => r.enumlabel))
  cachedInternalValidationLevel = labels.has('ENTERPRISE') ? 'ENTERPRISE' : 'GOLD'
  return cachedInternalValidationLevel
}

export type InternalKycSyncResult = 'updated' | 'already_verified' | 'not_found'

export type InternalKycSyncDetail = {
  result: InternalKycSyncResult
  userUpdated: boolean
  entitiesUpdated: number
}

/** Les 9 comptes internes BLOCKTRUST (admins dashboard + internes + Johanna). */
export function getInternalKycEmailList(): string[] {
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
    },
  })

  if (!user) {
    return { result: 'not_found', userUpdated: false, entitiesUpdated: 0 }
  }

  const userNeedsUpdate = user.kycStatus !== 'VERIFIED'
  const validationLevel = await resolveInternalValidationLevel()

  const entitiesUpdated = await prisma.$executeRaw`
    UPDATE "Entity"
    SET
      "kycStatus" = 'VERIFIED',
      "emailVerified" = true,
      "validationLevel" = ${validationLevel}::"ValidationLevel"
    WHERE "userId" = ${user.id}
      AND (
        "kycStatus" IS DISTINCT FROM 'VERIFIED'
        OR "validationLevel"::text IS DISTINCT FROM ${validationLevel}
      )
  `

  if (!userNeedsUpdate && entitiesUpdated === 0) {
    return { result: 'already_verified', userUpdated: false, entitiesUpdated: 0 }
  }

  if (userNeedsUpdate) {
    await prisma.$executeRaw`
      UPDATE "User"
      SET
        "kycStatus" = 'VERIFIED',
        "kycVerifiedAt" = COALESCE("kycVerifiedAt", NOW()),
        "kycRejectedAt" = NULL,
        "kycRejectedReason" = NULL
      WHERE "id" = ${user.id}
    `
  }

  return {
    result: 'updated',
    userUpdated: userNeedsUpdate,
    entitiesUpdated,
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

/** Sync KYC pour tous les comptes internes inscrits (9 emails canoniques). */
export async function syncAllInternalAccountsKyc(): Promise<InternalKycSyncDetail[]> {
  const results: InternalKycSyncDetail[] = []
  for (const email of getInternalKycEmailList()) {
    results.push(await syncInternalAccountKycByEmail(email))
  }
  return results
}
