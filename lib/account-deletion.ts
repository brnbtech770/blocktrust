// lib/account-deletion.ts
// Suppression compte self-service (RGPD Art.17) — anonymisation User
// ============================================================

import { prisma } from "@/app/lib/db";
import { isActiveBillingStatus } from "@/lib/plan-features";
import { stripe } from "@/lib/stripe";
import { sendEmailFireAndForget } from "@/lib/email";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { appBaseUrl } from "@/lib/agents/agent-utils";
import {
  anonymizeUserDataCascade,
  assertNoOrgOwnershipBlocks,
  findOrgOwnershipBlocks,
  OrgOwnershipTransferRequiredError,
} from "@/lib/user-deletion-cascade";
import * as React from "react";
import { AccountDeletedEmail } from "@/emails/AccountDeletedEmail";
import { AccountDeletionScheduledEmail } from "@/emails/AccountDeletionScheduledEmail";

export { OrgOwnershipTransferRequiredError } from "@/lib/user-deletion-cascade";

export const DELETION_GRACE_DAYS = 30;

export function getDeletionScheduledDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + DELETION_GRACE_DAYS);
  return d;
}

export async function userHasActivePaidSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, stripeSubscriptionId: true },
  });
  return Boolean(sub?.stripeSubscriptionId && isActiveBillingStatus(sub.status));
}

export async function scheduleAccountDeletion(userId: string, email: string): Promise<Date> {
  await assertNoOrgOwnershipBlocks(userId);

  const scheduledAt = getDeletionScheduledDate();

  await prisma.user.update({
    where: { id: userId },
    data: { accountDeletionScheduledAt: scheduledAt },
  });

  await writeSecurityAuditLog({
    action: "ACCOUNT_DELETION_REQUESTED",
    userId,
    resource: "user",
    resourceId: userId,
    metadata: { scheduledAt: scheduledAt.toISOString() },
  });

  sendEmailFireAndForget({
    to: email,
    subject: "Suppression de votre compte BLOCKTRUST™ programmée",
    react: React.createElement(AccountDeletionScheduledEmail, {
      deletionDate: scheduledAt.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      dashboardUrl: `${appBaseUrl()}/dashboard`,
    }),
  });

  return scheduledAt;
}

export async function cancelScheduledAccountDeletion(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { accountDeletionScheduledAt: null },
  });
}

export async function cancelStripeSubscriptionIfActive(userId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeSubscriptionId: true, status: true },
  });
  if (!sub?.stripeSubscriptionId || !isActiveBillingStatus(sub.status)) return;
  try {
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
  } catch (err) {
    console.error("[account-deletion] stripe cancel", err);
  }
}

export async function executeAccountDeletion(userId: string, emailForNotice: string): Promise<void> {
  const blocks = await findOrgOwnershipBlocks(userId);
  if (blocks.length > 0) {
    await cancelScheduledAccountDeletion(userId);
    throw new OrgOwnershipTransferRequiredError(blocks);
  }

  await cancelStripeSubscriptionIfActive(userId);

  await writeSecurityAuditLog({
    action: "ACCOUNT_DELETED",
    userId,
    resource: "user",
    resourceId: userId,
  });

  await prisma.$transaction((tx) => anonymizeUserDataCascade(userId, tx));

  if (emailForNotice.includes("@") && !emailForNotice.startsWith("deleted_")) {
    sendEmailFireAndForget({
      to: emailForNotice,
      subject: "Votre compte BLOCKTRUST™ a été supprimé",
      react: React.createElement(AccountDeletedEmail, {}),
    });
  }
}

export async function processDueAccountDeletions(now = new Date()): Promise<number> {
  const due = await prisma.user.findMany({
    where: {
      accountDeletionScheduledAt: { lte: now },
      email: { not: { startsWith: "deleted_" } },
    },
    select: { id: true, email: true },
    take: 50,
  });

  let processed = 0;
  for (const user of due) {
    if (!user.email) continue;
    try {
      await executeAccountDeletion(user.id, user.email);
      processed += 1;
    } catch (err) {
      if (err instanceof OrgOwnershipTransferRequiredError) {
        console.warn(
          `[account-deletion] blocked userId=${user.id.slice(0, 8)}… org ownership`,
        );
        continue;
      }
      throw err;
    }
  }

  return processed;
}
