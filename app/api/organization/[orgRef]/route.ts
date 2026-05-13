// app/api/organization/[orgRef]/route.ts
// Détail et mise à jour organisation (OWNER / ADMIN)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import { findOrganizationByRef, orgRoleCanManageOrgSettings, requireOrgMember } from '@/lib/org-vault-server'
import { countOrgVaultEntries, countOrgVaults, getVaultQuota } from '@/lib/vault-utils'

const patchBody = z.object({
  name: z.string().min(2).max(120).optional(),
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

  const [vaultCount, entryCount, members] = await Promise.all([
    countOrgVaults(org.id),
    countOrgVaultEntries(org.id),
    prisma.organizationMember.findMany({
      where: { organizationId: org.id, joinedAt: { not: null } },
      include: {
        user: { select: { id: true, email: true, name: true, image: true } },
      },
      orderBy: { joinedAt: 'asc' },
    }),
  ])

  const quotas = getVaultQuota(org.tier)

  return NextResponse.json({
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      tier: org.tier,
      maxSeats: org.maxSeats,
      createdAt: org.createdAt,
      vaultCount,
      entryCount,
      quotas: { maxVaults: quotas.maxVaults, maxEntries: quotas.maxEntries },
    },
    membership: { role: membership.role },
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
  })
}

export async function PATCH(
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
  if (!membership || !orgRoleCanManageOrgSettings(membership.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = patchBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const data = parsed.data
  if (!data.name) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: { name: data.name.trim() },
    select: { id: true, name: true, slug: true, tier: true },
  })

  return NextResponse.json({ organization: updated })
}
