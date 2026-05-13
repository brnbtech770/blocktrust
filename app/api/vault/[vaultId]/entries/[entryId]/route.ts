// app/api/vault/[vaultId]/entries/[entryId]/route.ts
// Suppression d’une entrée coffre
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { loadVaultForUser, orgRoleCanManageVaults } from '@/lib/org-vault-server'

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
