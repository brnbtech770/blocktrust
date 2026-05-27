// lib/trust-delegation.ts
// Matrice de délégation — qui peut certifier quoi dans BLOCKTRUST
// ============================================================

import { prisma } from '@/app/lib/db'

export type CertificationSubject =
  | 'EMAIL'
  | 'DOMAIN'
  | 'WALLET'
  | 'PHONE'
  | 'MEMBER'

export type UserRole =
  | 'PERSONAL'
  | 'KYC_VERIFIED'
  | 'ORG_ADMIN'
  | 'BLOCKTRUST_ADMIN'

export interface DelegationRight {
  subject: CertificationSubject
  canCertify: boolean
  requiresKYC: boolean
  maxCount: number
}

export const DELEGATION_MATRIX: Record<UserRole, DelegationRight[]> = {
  PERSONAL: [
    { subject: 'EMAIL', canCertify: true, requiresKYC: false, maxCount: 1 },
    { subject: 'PHONE', canCertify: true, requiresKYC: false, maxCount: 1 },
    { subject: 'DOMAIN', canCertify: false, requiresKYC: true, maxCount: 0 },
    { subject: 'WALLET', canCertify: false, requiresKYC: true, maxCount: 0 },
  ],

  KYC_VERIFIED: [
    { subject: 'EMAIL', canCertify: true, requiresKYC: true, maxCount: 5 },
    { subject: 'PHONE', canCertify: true, requiresKYC: true, maxCount: 3 },
    { subject: 'DOMAIN', canCertify: true, requiresKYC: true, maxCount: 3 },
    { subject: 'WALLET', canCertify: true, requiresKYC: true, maxCount: 5 },
  ],

  ORG_ADMIN: [
    { subject: 'EMAIL', canCertify: true, requiresKYC: false, maxCount: -1 },
    { subject: 'DOMAIN', canCertify: true, requiresKYC: false, maxCount: -1 },
    { subject: 'MEMBER', canCertify: true, requiresKYC: false, maxCount: -1 },
    { subject: 'WALLET', canCertify: true, requiresKYC: false, maxCount: -1 },
  ],

  BLOCKTRUST_ADMIN: [
    { subject: 'EMAIL', canCertify: true, requiresKYC: false, maxCount: -1 },
    { subject: 'DOMAIN', canCertify: true, requiresKYC: false, maxCount: -1 },
    { subject: 'MEMBER', canCertify: true, requiresKYC: false, maxCount: -1 },
    { subject: 'WALLET', canCertify: true, requiresKYC: false, maxCount: -1 },
  ],
}

export type CertificationCounts = Record<CertificationSubject, number>

export function getUserRole(user: {
  kycStatus: string
  isAdmin: boolean
  isOrgAdmin: boolean
}): UserRole {
  if (user.isAdmin) return 'BLOCKTRUST_ADMIN'
  if (user.isOrgAdmin) return 'ORG_ADMIN'
  if (user.kycStatus === 'VERIFIED') return 'KYC_VERIFIED'
  return 'PERSONAL'
}

export function canUserCertify(
  role: UserRole,
  subject: CertificationSubject,
  currentCount: number,
): { allowed: boolean; reason?: string } {
  const rights = DELEGATION_MATRIX[role]
  const right = rights.find((r) => r.subject === subject)

  if (!right || !right.canCertify) {
    return {
      allowed: false,
      reason: right?.requiresKYC
        ? "Vérification d'identité requise"
        : 'Non autorisé pour ce type de certification',
    }
  }

  if (right.maxCount !== -1 && currentCount >= right.maxCount) {
    return {
      allowed: false,
      reason: `Limite atteinte (${right.maxCount} maximum)`,
    }
  }

  return { allowed: true }
}

export function getRoleDisplayLabel(role: UserRole): string {
  switch (role) {
    case 'PERSONAL':
      return 'Compte personnel'
    case 'KYC_VERIFIED':
      return 'KYC vérifié'
    case 'ORG_ADMIN':
      return 'Administrateur organisation'
    case 'BLOCKTRUST_ADMIN':
      return 'Administrateur BLOCKTRUST'
  }
}

export function getSubjectDisplayLabel(subject: CertificationSubject): string {
  switch (subject) {
    case 'EMAIL':
      return 'Emails certifiés'
    case 'PHONE':
      return 'Téléphones certifiés'
    case 'DOMAIN':
      return 'Domaines certifiés'
    case 'WALLET':
      return 'Wallets certifiés'
    case 'MEMBER':
      return 'Membres certifiés'
  }
}

export function formatDelegationMax(maxCount: number): string {
  return maxCount === -1 ? 'illimité' : String(maxCount)
}

export function inferCertificationSubject(entity: {
  walletAddress?: string | null
  organizationId?: string | null
  certifiedDomains?: string[]
}): CertificationSubject {
  if (entity.walletAddress?.trim()) return 'WALLET'
  if (entity.organizationId) return 'MEMBER'
  if ((entity.certifiedDomains?.length ?? 0) > 0) return 'DOMAIN'
  return 'EMAIL'
}

export async function checkIsOrgAdmin(userId: string): Promise<boolean> {
  try {
    const owned = await prisma.organization.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    })
    if (owned) return true

    const adminMember = await prisma.organizationMember.findFirst({
      where: {
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
        joinedAt: { not: null },
      },
      select: { id: true },
    })
    return Boolean(adminMember)
  } catch {
    return false
  }
}

export async function getUserCertificationCounts(
  userId: string,
  organizationId?: string | null,
): Promise<CertificationCounts> {
  const empty: CertificationCounts = {
    EMAIL: 0,
    PHONE: 0,
    DOMAIN: 0,
    WALLET: 0,
    MEMBER: 0,
  }

  try {
    const [user, certCount, walletCount, memberCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          certifiedEmails: true,
          certifiedPhones: true,
          certifiedDomains: true,
        },
      }),
      prisma.certificate.count({
        where: {
          entity: { userId },
          status: { in: ['ACTIVE', 'PENDING', 'ANCHORED'] },
        },
      }),
      prisma.entity.count({
        where: {
          userId,
          walletAddress: { not: null },
          NOT: [{ walletAddress: '' }],
        },
      }),
      organizationId
        ? prisma.organizationMember.count({
            where: { organizationId, joinedAt: { not: null } },
          })
        : Promise.resolve(0),
    ])

    return {
      EMAIL: Math.max(user?.certifiedEmails.length ?? 0, certCount),
      PHONE: user?.certifiedPhones.length ?? 0,
      DOMAIN: user?.certifiedDomains.length ?? 0,
      WALLET: walletCount,
      MEMBER: memberCount,
    }
  } catch {
    return empty
  }
}

export async function countActiveCertificatesForSubject(
  userId: string,
  subject: CertificationSubject,
): Promise<number> {
  try {
    if (subject === 'EMAIL' || subject === 'MEMBER') {
      return prisma.certificate.count({
        where: {
          entity: { userId },
          status: { in: ['ACTIVE', 'PENDING', 'ANCHORED'] },
        },
      })
    }
    const counts = await getUserCertificationCounts(userId)
    return counts[subject]
  } catch {
    return 0
  }
}

export function getDelegationUpgradeAction(
  role: UserRole,
  kycStatus: string,
  rights: DelegationRight[],
  counts: CertificationCounts,
): { href: string; label: string } | null {
  if (role === 'PERSONAL' && kycStatus !== 'VERIFIED') {
    return { href: '/onboarding/verify', label: 'Améliorer mes droits' }
  }

  const atLimit = rights.some(
    (r) =>
      r.canCertify &&
      r.maxCount !== -1 &&
      counts[r.subject] >= r.maxCount,
  )

  if (atLimit) {
    return { href: '/pricing', label: 'Améliorer mes droits' }
  }

  if (role === 'PERSONAL') {
    return { href: '/onboarding/verify', label: 'Améliorer mes droits' }
  }

  return null
}

export type DelegationRightsSummary = {
  role: UserRole
  roleLabel: string
  rights: Array<
    DelegationRight & {
      label: string
      currentCount: number
      maxLabel: string
    }
  >
  upgrade: { href: string; label: string } | null
}

export function buildDelegationRightsSummary(
  role: UserRole,
  kycStatus: string,
  counts: CertificationCounts,
): DelegationRightsSummary {
  const rights = DELEGATION_MATRIX[role].map((right) => ({
    ...right,
    label: getSubjectDisplayLabel(right.subject),
    currentCount: counts[right.subject],
    maxLabel: formatDelegationMax(right.maxCount),
  }))

  return {
    role,
    roleLabel: getRoleDisplayLabel(role),
    rights,
    upgrade: getDelegationUpgradeAction(role, kycStatus, DELEGATION_MATRIX[role], counts),
  }
}
