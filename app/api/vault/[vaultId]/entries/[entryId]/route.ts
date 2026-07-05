// app/api/vault/[vaultId]/entries/[entryId]/route.ts
// Modification / suppression d’une entrée coffre
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import { loadVaultForUser, orgRoleCanManageVaults } from '@/lib/org-vault-server'
import { vaultEntryTypeSchema } from '@/lib/vault-entry-schema'
import {
  buildVaultEntryWriteData,
  canEncryptVaultEntries,
  readVaultEntryPlaintext,
  serializeVaultEntryForClient,
  validateVaultEntryValue,
} from '@/lib/vault-entry-value'
import { vaultRateLimitResponse, orgRoleCanRevealVaultValues } from '@/lib/vault-api-utils'
import { auditVaultAction } from '@/lib/vault-audit'

const patchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  type: vaultEntryTypeSchema.optional(),
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

  const rl = await vaultRateLimitResponse(session.user.id)
  if (rl) return rl

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

  const nextType = d.type ?? entry.type
  if (d.value !== undefined) {
    if (!canEncryptVaultEntries()) {
      return NextResponse.json({ error: 'Configuration coffre indisponible' }, { status: 503 })
    }
    const valueCheck = validateVaultEntryValue(nextType, d.value)
    if (!valueCheck.ok) {
      return NextResponse.json({ error: valueCheck.error }, { status: 400 })
    }
  }

  const enc =
    d.value !== undefined ? buildVaultEntryWriteData(d.value) : null

  const updated = await prisma.trustVaultEntry.update({
    where: { id: entry.id },
    data: {
      ...(d.name !== undefined ? { name: d.name.trim() } : {}),
      ...(d.type !== undefined ? { type: d.type } : {}),
      ...(enc ? { value: enc.value, valueEnc: enc.valueEnc } : {}),
      ...(d.description !== undefined
        ? { description: d.description === null ? null : d.description.trim() || null }
        : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      value: true,
      valueEnc: true,
      description: true,
      createdAt: true,
    },
  })

  auditVaultAction({
    action: 'VAULT_ENTRY_UPDATED',
    userId: session.user.id,
    vaultId: loaded.vault.id,
    entryId: updated.id,
    entryType: updated.type,
    valueForHash: d.value ?? readVaultEntryPlaintext(entry),
  })

  const canReveal = orgRoleCanRevealVaultValues(loaded.membership.role)
  return NextResponse.json({ entry: serializeVaultEntryForClient(updated, { canReveal }) })
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ vaultId: string; entryId: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rl = await vaultRateLimitResponse(session.user.id)
  if (rl) return rl

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

  auditVaultAction({
    action: 'VAULT_ENTRY_DELETED',
    userId: session.user.id,
    vaultId: loaded.vault.id,
    entryId: entry.id,
    entryType: entry.type,
    valueForHash: readVaultEntryPlaintext(entry),
  })

  await prisma.trustVaultEntry.delete({ where: { id: entry.id } })

  return NextResponse.json({ ok: true })
}
