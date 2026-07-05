// lib/org-vault-server.ts
// Accès serveur organisation + coffres (BlockTrust Vault)
// ============================================================
// NOTE (chantier futur) : TrustVaultPermission (RBAC par coffre) existe en
// schéma Prisma mais n'est pas encore branché — RBAC actuel = OrganizationMember.role.

import { prisma } from '@/app/lib/db'
import type { OrgRole } from '@prisma/client'

export async function findOrganizationByRef(orgRef: string) {
  return prisma.organization.findFirst({
    where: { OR: [{ id: orgRef }, { slug: orgRef }] },
  })
}

export async function requireOrgMember(userId: string, organizationId: string) {
  const m = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  })
  if (!m?.joinedAt) return null
  return m
}

export async function loadVaultForUser(vaultId: string, userId: string) {
  const vault = await prisma.trustVault.findUnique({
    where: { id: vaultId },
    include: { organization: true },
  })
  if (!vault) return null
  const m = await requireOrgMember(userId, vault.organizationId)
  if (!m) return null
  return { vault, membership: m }
}

export function orgRoleCanManageVaults(role: OrgRole): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER'
}

export function orgRoleCanManageOrgSettings(role: OrgRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

export function orgRoleCanInvite(role: OrgRole): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER'
}

export function orgRoleCanDeleteVault(role: OrgRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}
