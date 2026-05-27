// app/api/vault/[vaultId]/entries/[entryId]/route.ts
// Modification / suppression d’une entrée coffre
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import { loadVaultForUser, orgRoleCanManageVaults } from '@/lib/org-vault-server'

const entryTypes = z.enum(['CONTACT', 'DOMAIN', 'EMAIL', 'PHONE', 'URL', 'WALLET'])

const patchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  type: entryTypes.optional(),
  value: z.string().min(1).max(2000).optional(),
  description: z.string().max(2000).optional().nullable(),
})

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ vaultId: string; entryId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { vaultId, entryId } = await ctx.params
  const loaded = await loadVaultForUser(vaultId, session.user.id)
  if (!loaded) {
    return NextResponse.json({ error: 'Coffre introuvable' }, { status: 404 })
  }

  if (!orgRoleCanManageVaults(loaded.membership.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const entry = await prisma.trustVaultEntry.findFirst({
    where: { id: entryId, vaultId: loaded.vault.id },
  })
  if (!entry) {
    return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })
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
  if (
    d.name === undefined &&
    d.type === undefined &&
    d.value === undefined &&
    d.description === undefined
  ) {
    return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
  }

  const updated = await prisma.trustVaultEntry.update({
    where: { id: entry.id },
    data: {
      ...(d.name !== undefined ? { name: d.name.trim() } : {}),
      ...(d.type !== undefined ? { type: d.type } : {}),
      ...(d.value !== undefined ? { value: d.value.trim() } : {}),
      ...(d.description !== undefined
        ? { description: d.description === null ? null : d.description.trim() || null }
        : {}),
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

  return NextResponse.json({ entry: updated })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ vaultId: string; entryId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { vaultId, entryId } = await ctx.params
  const loaded = await loadVaultForUser(vaultId, session.user.id)
  if (!loaded) {
    return NextResponse.json({ error: 'Coffre introuvable' }, { status: 404 })
  }

  if (!orgRoleCanManageVaults(loaded.membership.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const entry = await prisma.trustVaultEntry.findFirst({
    where: { id: entryId, vaultId: loaded.vault.id },
  })
  if (!entry) {
    return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })
  }

  await prisma.trustVaultEntry.delete({ where: { id: entry.id } })

  return NextResponse.json({ ok: true })
}
