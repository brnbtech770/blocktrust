// app/api/vault/[vaultId]/entries/route.ts
// Entrées d’un coffre
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { loadVaultForUser, orgRoleCanManageVaults } from '@/lib/org-vault-server'
import { countOrgVaultEntries, getVaultQuota } from '@/lib/vault-utils'
import { vaultEntryCreateSchema } from '@/lib/vault-entry-schema'
import {
  buildVaultEntryWriteData,
  canEncryptVaultEntries,
  serializeVaultEntryForClient,
  validateVaultEntryValue,
} from '@/lib/vault-entry-value'
import { vaultRateLimitResponse, orgRoleCanRevealVaultValues } from '@/lib/vault-api-utils'
import { auditVaultAction } from '@/lib/vault-audit'

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

  const canReveal = orgRoleCanRevealVaultValues(loaded.membership.role)

  const entries = await prisma.trustVaultEntry.findMany({
    where: { vaultId: loaded.vault.id },
    orderBy: { createdAt: 'desc' },
    include: {
      addedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({
    entries: entries.map((e) => ({
      ...serializeVaultEntryForClient(e, { canReveal }),
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

  const rl = await vaultRateLimitResponse(session.user.id)
  if (rl) return rl

  if (!canEncryptVaultEntries()) {
    return NextResponse.json({ error: 'Configuration coffre indisponible' }, { status: 503 })
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

  const parsed = vaultEntryCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const row = parsed.data
  const valueCheck = validateVaultEntryValue(row.type, row.value)
  if (!valueCheck.ok) {
    return NextResponse.json({ error: valueCheck.error }, { status: 400 })
  }

  const enc = buildVaultEntryWriteData(row.value)
  const entry = await prisma.trustVaultEntry.create({
    data: {
      vaultId: loaded.vault.id,
      name: row.name.trim(),
      type: row.type,
      value: enc.value,
      valueEnc: enc.valueEnc,
      description: row.description?.trim() || null,
      addedById: session.user.id,
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
    action: 'VAULT_ENTRY_CREATED',
    userId: session.user.id,
    vaultId: loaded.vault.id,
    entryId: entry.id,
    entryType: entry.type,
    valueForHash: row.value,
  })

  const canReveal = orgRoleCanRevealVaultValues(loaded.membership.role)
  return NextResponse.json({ entry: serializeVaultEntryForClient(entry, { canReveal }) })
}
