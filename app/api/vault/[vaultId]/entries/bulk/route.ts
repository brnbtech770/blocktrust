// app/api/vault/[vaultId]/entries/bulk/route.ts
// Import groupé d’entrées (ex. fichier CSV converti côté client en JSON)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import { loadVaultForUser, orgRoleCanManageVaults } from '@/lib/org-vault-server'
import { countOrgVaultEntries, getVaultQuota } from '@/lib/vault-utils'
import { vaultEntryCreateSchema } from '@/lib/vault-entry-schema'
import {
  buildVaultEntryWriteData,
  canEncryptVaultEntries,
  validateVaultEntryValue,
} from '@/lib/vault-entry-value'
import { vaultRateLimitResponse } from '@/lib/vault-api-utils'
import { auditVaultAction } from '@/lib/vault-audit'

const bulkBody = z.object({
  entries: z.array(vaultEntryCreateSchema).min(1).max(500),
})

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
  const currentTotal = await countOrgVaultEntries(loaded.vault.organizationId)
  const remaining = quotas.maxEntries - currentTotal
  if (remaining <= 0) {
    return NextResponse.json({ error: 'Quota d’entrées coffre atteint' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = bulkBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const rows = parsed.data.entries
  const validRows: typeof rows = []
  for (const row of rows) {
    const check = validateVaultEntryValue(row.type, row.value)
    if (check.ok) validRows.push(row)
  }

  const toInsert = validRows.slice(0, remaining)

  if (toInsert.length > 0) {
    await prisma.trustVaultEntry.createMany({
      data: toInsert.map((row) => {
        const enc = buildVaultEntryWriteData(row.value)
        return {
          vaultId: loaded.vault.id,
          name: row.name.trim(),
          type: row.type,
          value: enc.value,
          valueEnc: enc.valueEnc,
          description: row.description?.trim() || null,
          addedById: session.user.id,
        }
      }),
    })

    for (const row of toInsert) {
      auditVaultAction({
        action: 'VAULT_ENTRY_CREATED',
        userId: session.user.id,
        vaultId: loaded.vault.id,
        entryType: row.type,
        valueForHash: row.value,
        metadata: { source: 'bulk' },
      })
    }
  }

  return NextResponse.json({
    created: toInsert.length,
    skipped: rows.length - toInsert.length,
  })
}
