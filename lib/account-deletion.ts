// lib/account-deletion.ts
// Suppression compte self-service (RGPD Art.17) — anonymisation User
// ============================================================

import { prisma } from "@/app/lib/db";
import { isActiveBillingStatus } from "@/lib/plan-features";
import { stripe } from "@/lib/stripe";
import { sendEmailFireAndForget } from "@/lib/email";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import { appBaseUrl } from "@/lib/agents/agent-utils";
import type { Prisma } from "@prisma/client";
import * as React from "react";
import { AccountDeletedEmail } from "@/emails/AccountDeletedEmail";
import { AccountDeletionScheduledEmail } from "@/emails/AccountDeletionScheduledEmail";

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

async function cancelStripeSubscription(userId: string): Promise<void> {
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

export async function anonymizeUserTransaction(
  userId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  const entityRows = await tx.entity.findMany({
    where: { userId },
    select: { id: true },
  });
  const entityIds = entityRows.map((e) => e.id);

  if (entityIds.length > 0) {
    await tx.aIAlert.deleteMany({ where: { entityId: { in: entityIds } } });
    await tx.adminAlert.deleteMany({ where: { entityId: { in: entityIds } } });
  }

  await tx.interactionSignature.deleteMany({
    where: { senderId: userId },
  });

  await tx.userManualTrustEntry.deleteMany({ where: { requestedBy: userId } });
  await tx.userTrustRelation.deleteMany({
    where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
  });

  await tx.trustVaultPermission.deleteMany({ where: { userId } });
  await tx.trustVaultEntry.deleteMany({ where: { addedById: userId } });

  await tx.organizationMember.deleteMany({ where: { userId } });
  await tx.personalAccountMember.deleteMany({ where: { userId } });
  await tx.adminAlert.deleteMany({ where: { userId } });
  await tx.whiteLabelConfig.deleteMany({ where: { userId } });
  await tx.kYCVerification.deleteMany({ where: { userId } });
  await tx.account.deleteMany({ where: { userId } });
  await tx.session.deleteMany({ where: { userId } });
  await tx.userDevice.deleteMany({ where: { userId } });
  await tx.entity.deleteMany({ where: { userId } });
  await tx.subscription.deleteMany({ where: { userId } });

  if (user.email) {
    await tx.passwordReset.deleteMany({ where: { email: user.email } });
  }

  await tx.auditLog.deleteMany({ where: { userId } });

  await tx.user.update({
    where: { id: userId },
    data: {
      email: `deleted_${userId}@blocktrust.tech`,
      name: "Compte supprimé",
      password: null,
      image: null,
      phone: null,
      company: null,
      stripeCustomerId: null,
      extensionApiKeyHash: null,
      extensionApiKey: null,
      extensionApiKeyEnc: null,
      accountDeletionScheduledAt: null,
      sessionVersion: { increment: 1 },
    },
  });
}

export async function executeAccountDeletion(userId: string, emailForNotice: string): Promise<void> {
  await cancelStripeSubscription(userId);

  await writeSecurityAuditLog({
    action: "ACCOUNT_DELETED",
    userId,
    resource: "user",
    resourceId: userId,
  });

  await prisma.$transaction((tx) => anonymizeUserTransaction(userId, tx));

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

  for (const user of due) {
    if (!user.email) continue;
    await executeAccountDeletion(user.id, user.email);
  }

  return due.length;
}
