// lib/admin-delete-user.ts
// Suppression admin — délègue à l'anonymisation RGPD (User row conservé)
// ============================================================

import { prisma } from '@/app/lib/db'
import type { Prisma } from '@prisma/client'
import { anonymizeUserDataCascade } from '@/lib/user-deletion-cascade'
import { cancelStripeSubscriptionIfActive } from '@/lib/account-deletion'

/** Suppression immédiate (scripts / bulk) — anonymisation, pas de hard delete. */
export async function deleteUserAdmin(userId: string): Promise<void> {
  await cancelStripeSubscriptionIfActive(userId)
  await prisma.$transaction((tx) => anonymizeUserDataCascade(userId, tx))
}

/** @deprecated Utiliser deleteAccountAsAdmin ou deleteUserAdmin */
export async function deleteAdminUserTransaction(
  userId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  await anonymizeUserDataCascade(userId, tx)
}
