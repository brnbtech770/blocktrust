// app/api/vault/[vaultId]/entries/route.ts
// Entrées d’un coffre
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import { loadVaultForUser, orgRoleCanManageVaults } from '@/lib/org-vault-server'
import { countOrgVaultEntries, getVaultQuota } from '@/lib/vault-utils'

const entryTypes = z.enum(['CONTACT', 'DOMAIN', 'EMAIL', 'PHONE', 'URL', 'WALLET'])

const createBody = z.object({
  name: z.string().min(1).max(200),
  type: entryTypes,
  value: z.string().min(1).max(2000),
  description: z.string().max(2000).optional().nullable(),
})

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ vaultId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { vaultId } = await ctx.params
  const loaded = await loadVaultForUser(vaultId, session.user.id)
  if (!loaded) {
    return NextResponse.json({ error: 'Coffre introuvable' }, { status: 404 })
  }

  const entries = await prisma.trustVaultEntry.findMany({
    where: { vaultId: loaded.vault.id },
    orderBy: { createdAt: 'desc' },
    include: {
      addedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    entries: entries.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      value: e.value,
      description: e.description,
      createdAt: e.createdAt,
      addedBy: e.addedBy,
    })),
  })
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ vaultId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { vaultId } = await ctx.params
  const loaded = await loadVaultForUser(vaultId, session.user.id)
  if (!loaded) {
    return NextResponse.json({ error: 'Coffre introuvable' }, { status: 404 })
  }

  if (!orgRoleCanManageVaults(loaded.membership.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: loaded.vault.organizationId },
    select: { tier: true },
  })
  if (!org) {
    return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
  }

  const quotas = getVaultQuota(org.tier)
  const entryTotal = await countOrgVaultEntries(loaded.vault.organizationId)
  if (entryTotal >= quotas.maxEntries) {
    return NextResponse.json({ error: 'Quota d’entrées coffre atteint' }, { status: 403 })
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

  const row = parsed.data
  const entry = await prisma.trustVaultEntry.create({
    data: {
      vaultId: loaded.vault.id,
      name: row.name.trim(),
      type: row.type,
      value: row.value.trim(),
      description: row.description?.trim() || null,
      addedById: session.user.id,
    },
    select: {
      id: true,
      name: true,
      type: true,
      value: true,
      description: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ entry })
}
