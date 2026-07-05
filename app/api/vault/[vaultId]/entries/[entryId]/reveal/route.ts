// app/api/vault/[vaultId]/entries/[entryId]/reveal/route.ts
// Révélation valeur chiffrée (OWNER / ADMIN uniquement)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { loadVaultForUser } from '@/lib/org-vault-server'
import { readVaultEntryPlaintext } from '@/lib/vault-entry-value'
import { vaultRateLimitResponse, orgRoleCanRevealVaultValues } from '@/lib/vault-api-utils'
import { auditVaultAction } from '@/lib/vault-audit'

export async function POST(
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

  if (!orgRoleCanRevealVaultValues(loaded.membership.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const entry = await prisma.trustVaultEntry.findFirst({
    where: { id: entryId, vaultId: loaded.vault.id },
    select: { id: true, type: true, value: true, valueEnc: true },
  })
  if (!entry) {
    return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 })
  }

  const plaintext = readVaultEntryPlaintext(entry)

  auditVaultAction({
    action: 'VAULT_ENTRY_REVEALED',
    userId: session.user.id,
    vaultId: loaded.vault.id,
    entryId: entry.id,
    entryType: entry.type,
    valueForHash: plaintext,
  })

  return NextResponse.json({ value: plaintext })
}
