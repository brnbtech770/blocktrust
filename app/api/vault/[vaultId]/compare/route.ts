// app/api/vault/[vaultId]/compare/route.ts
// Comparaison RIB/IBAN reçu vs coffre (REST)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { loadVaultForUser } from '@/lib/org-vault-server'
import { vaultCompareBodySchema } from '@/lib/vault-entry-schema'
import { compareVaultRibValues } from '@/lib/vault-entry-value'
import { vaultRateLimitResponse } from '@/lib/vault-api-utils'
import { auditVaultAction } from '@/lib/vault-audit'

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

  const { vaultId } = await ctx.params
  const loaded = await loadVaultForUser(vaultId, session.user.id)
  if (!loaded) {
    return NextResponse.json({ error: 'Coffre introuvable' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = vaultCompareBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { compareValue, query, entryId } = parsed.data

  const entries = await prisma.trustVaultEntry.findMany({
    where: { vaultId: loaded.vault.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      type: true,
      value: true,
      valueEnc: true,
      description: true,
    },
  })

  let pool = entries
  if (entryId) {
    pool = entries.filter((e) => e.id === entryId)
  } else if (query?.trim()) {
    const q = query.trim().toLowerCase()
    pool = entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false),
    )
  }

  const result = compareVaultRibValues(pool, compareValue)
  const verdict =
    result.fraudAlert?.type === 'RIB_MATCH'
      ? 'MATCH'
      : result.fraudAlert?.type === 'RIB_MISMATCH'
        ? 'MISMATCH'
        : 'NO_POOL'

  auditVaultAction({
    action: 'VAULT_COMPARE',
    userId: session.user.id,
    vaultId: loaded.vault.id,
    entryId: result.matchedEntryId,
    valueForHash: compareValue,
    metadata: { result: verdict, source: 'rest' },
  })

  return NextResponse.json({
    verdict,
    fraudAlert: result.fraudAlert,
    matchedEntryId: result.matchedEntryId,
  })
}
