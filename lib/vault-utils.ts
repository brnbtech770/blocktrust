// lib/vault-utils.ts
// Quotas Vault B2B + détection correspondance coffre (vérification publique)
// ============================================================

import { prisma } from '@/app/lib/db'

export function getVaultQuota(plan: string): {
  maxVaults: number
  maxEntries: number
} {
  switch (plan) {
    case 'SOLO_PRO':
    case 'B2B_SOLO_PRO':
      return { maxVaults: 1, maxEntries: 200 }
    case 'STARTER':
    case 'B2B_STARTER':
      return { maxVaults: 1, maxEntries: 200 }
    case 'TEAM':
    case 'B2B_TEAM':
      return { maxVaults: 3, maxEntries: 500 }
    case 'BUSINESS':
    case 'B2B_BUSINESS':
    case 'ENTERPRISE':
    case 'B2B_ENTERPRISE':
      return { maxVaults: 999, maxEntries: 999999 }
    default:
      return { maxVaults: 0, maxEntries: 0 }
  }
}

export function getOrgUserQuota(plan: string): number {
  switch (plan) {
    case 'SOLO_PRO':
    case 'B2B_SOLO_PRO':
      return 1
    case 'STARTER':
    case 'B2B_STARTER':
      return 5
    case 'TEAM':
    case 'B2B_TEAM':
      return 15
    case 'BUSINESS':
    case 'B2B_BUSINESS':
      return 50
    case 'ENTERPRISE':
    case 'B2B_ENTERPRISE':
      return 999
    default:
      return 1
  }
}

export function hasOrgAccess(plan: string): boolean {
  return [
    'SOLO_PRO',
    'B2B_SOLO_PRO',
    'STARTER',
    'B2B_STARTER',
    'TEAM',
    'B2B_TEAM',
    'BUSINESS',
    'B2B_BUSINESS',
    'ENTERPRISE',
    'B2B_ENTERPRISE',
  ].includes(plan)
}

export async function getSubscriptionPlanCodeForUser(userId: string): Promise<string> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  })
  if (sub?.status === 'active' && sub.plan) return sub.plan
  return ''
}

export type VaultMatchResult = {
  inOrganization: boolean
  match: boolean
}

/**
 * Cherche une entrée Vault (EMAIL / DOMAIN) pour un utilisateur membre d'au moins une organisation.
 * @returns null si l'utilisateur n'est dans aucune organisation active (joinedAt défini).
 */
export async function checkVaultMatchForUserContacts(args: {
  userId: string
  emails?: string[] | null
  domains?: string[] | null
}): Promise<VaultMatchResult | null> {
  const emails = (args.emails ?? [])
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)
  const domains = (args.domains ?? [])
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0)

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: args.userId, joinedAt: { not: null } },
    include: {
      organization: {
        include: {
          vaults: { include: { entries: true } },
        },
      },
    },
  })
  if (memberships.length === 0) return null

  if (emails.length === 0 && domains.length === 0) {
    return { inOrganization: true, match: false }
  }

  const emailSet = new Set(emails)
  const domainSet = new Set(domains)

  const allEntries = memberships.flatMap((m) =>
    m.organization.vaults.flatMap((v) => v.entries),
  )

  const match = allEntries.some((e) => {
    const val = e.value.trim().toLowerCase()
    if (e.type === 'EMAIL' && emailSet.has(val)) return true
    if (e.type === 'DOMAIN' && domainSet.has(val)) return true
    return false
  })

  return { inOrganization: true, match }
}

export async function checkVaultMatchForUser(args: {
  userId: string
  email?: string | null
  domain?: string | null
}): Promise<VaultMatchResult | null> {
  return checkVaultMatchForUserContacts({
    userId: args.userId,
    emails: args.email ? [args.email] : [],
    domains: args.domain ? [args.domain] : [],
  })
}

export async function countOrgVaults(organizationId: string): Promise<number> {
  return prisma.trustVault.count({ where: { organizationId } })
}

export async function countOrgVaultEntries(organizationId: string): Promise<number> {
  return prisma.trustVaultEntry.count({
    where: { vault: { organizationId } },
  })
}

export function slugifyOrgName(name: string): string {
  const raw = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return raw.length > 0 ? raw : 'organisation'
}
