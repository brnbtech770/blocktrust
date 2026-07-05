// app/api/vault/[vaultId]/route.ts
// Détail / mise à jour / suppression d’un coffre
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import {
  loadVaultForUser,
  orgRoleCanDeleteVault,
  orgRoleCanManageVaults,
} from '@/lib/org-vault-server'
import { serializeVaultEntryForClient } from '@/lib/vault-entry-value'
import { vaultRateLimitResponse, orgRoleCanRevealVaultValues } from '@/lib/vault-api-utils'

const patchBody = z.object({
  name: z.string().min(1).max(120).optional(),
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

  const rl = await vaultRateLimitResponse(session.user.id)
  if (rl) return rl

  const { vaultId } = await ctx.params
  const loaded = await loadVaultForUser(vaultId, session.user.id)
  if (!loaded) {
    return NextResponse.json({ error: 'Coffre introuvable' }, { status: 404 })
  }

  const { vault } = loaded
  const canReveal = orgRoleCanRevealVaultValues(loaded.membership.role)

  const entries = await prisma.trustVaultEntry.findMany({
    where: { vaultId: vault.id },
    orderBy: { createdAt: 'desc' },
    include: {
      addedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    vault: {
      id: vault.id,
      name: vault.name,
      description: vault.description,
      organizationId: vault.organizationId,
      createdAt: vault.createdAt,
    },
    entries: entries.map((e) => ({
      ...serializeVaultEntryForClient(e, { canReveal }),
      createdAt: e.createdAt,
      addedBy: e.addedBy,
    })),
    membership: { role: loaded.membership.role },
  })
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ vaultId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rl = await vaultRateLimitResponse(session.user.id)
  if (rl) return rl

  const { vaultId } = await ctx.params
  const loaded = await loadVaultForUser(vaultId, session.user.id)
  if (!loaded) {
    return NextResponse.json({ error: 'Coffre introuvable' }, { status: 404 })
  }

  if (!orgRoleCanManageVaults(loaded.membership.role)) {
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

  const d = parsed.data
  if (d.name === undefined && d.description === undefined) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const updated = await prisma.trustVault.update({
    where: { id: loaded.vault.id },
    data: {
      ...(d.name !== undefined ? { name: d.name.trim() } : {}),
      ...(d.description !== undefined
        ? { description: d.description === null ? null : d.description.trim() || null }
        : {}),
    },
    select: { id: true, name: true, description: true },
  })

  return NextResponse.json({ vault: updated })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ vaultId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rl = await vaultRateLimitResponse(session.user.id)
  if (rl) return rl

  const { vaultId } = await ctx.params
  const loaded = await loadVaultForUser(vaultId, session.user.id)
  if (!loaded) {
    return NextResponse.json({ error: 'Coffre introuvable' }, { status: 404 })
  }

  if (!orgRoleCanDeleteVault(loaded.membership.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  await prisma.trustVault.delete({ where: { id: loaded.vault.id } })

  return NextResponse.json({ ok: true })
}
