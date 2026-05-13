// app/api/organization/[orgRef]/vaults/route.ts
// Coffres d’une organisation
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import {
  findOrganizationByRef,
  orgRoleCanManageVaults,
  requireOrgMember,
} from '@/lib/org-vault-server'
import { countOrgVaultEntries, countOrgVaults, getVaultQuota } from '@/lib/vault-utils'

const createBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
})

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orgRef: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orgRef } = await ctx.params
  const org = await findOrganizationByRef(orgRef)
  if (!org) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const membership = await requireOrgMember(session.user.id, org.id)
  if (!membership) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const vaults = await prisma.trustVault.findMany({
    where: { organizationId: org.id },
    include: { _count: { select: { entries: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const quotas = getVaultQuota(org.tier)
  const entryTotal = await countOrgVaultEntries(org.id)

  return NextResponse.json({
    vaults: vaults.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
      createdAt: v.createdAt,
      entryCount: v._count.entries,
    })),
    quotas: { maxVaults: quotas.maxVaults, maxEntries: quotas.maxEntries },
    entryTotal,
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orgRef: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orgRef } = await ctx.params
  const org = await findOrganizationByRef(orgRef)
  if (!org) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const membership = await requireOrgMember(session.user.id, org.id)
  if (!membership || !orgRoleCanManageVaults(membership.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = createBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const quotas = getVaultQuota(org.tier)
  const vaultCount = await countOrgVaults(org.id)
  if (vaultCount >= quotas.maxVaults) {
    return NextResponse.json({ error: 'Nombre maximum de coffres atteint' }, { status: 403 })
  }

  const vault = await prisma.trustVault.create({
    data: {
      organizationId: org.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
    },
    select: { id: true, name: true, description: true, createdAt: true },
  })

  return NextResponse.json({ vault })
}
