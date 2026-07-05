// lib/user-deletion-cascade.ts
// Cascade RGPD partagée — self-service (anonymisation) et admin
// ============================================================

import { prisma } from "@/app/lib/db";
import type { Prisma } from "@prisma/client";

export type OrgOwnershipBlock = { orgId: string; orgName: string };

export class OrgOwnershipTransferRequiredError extends Error {
  readonly code = "ORG_OWNERSHIP_TRANSFER_REQUIRED" as const;
  readonly blocks: OrgOwnershipBlock[];

  constructor(blocks: OrgOwnershipBlock[]) {
    super(
      blocks.length === 1
        ? `Transférez la propriété de l'organisation « ${blocks[0].orgName} » avant de supprimer votre compte.`
        : "Transférez la propriété de vos organisations avant de supprimer votre compte.",
    );
    this.blocks = blocks;
  }
}

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function findOrgOwnershipBlocks(
  userId: string,
  db: DbClient = prisma,
): Promise<OrgOwnershipBlock[]> {
  const ownedOrgs = await db.organization.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      name: true,
      members: {
        where: {
          userId: { not: userId },
          role: { in: ["OWNER", "ADMIN"] },
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  return ownedOrgs
    .filter((o) => o.members.length > 0)
    .map((o) => ({ orgId: o.id, orgName: o.name }));
}

export async function assertNoOrgOwnershipBlocks(userId: string): Promise<void> {
  const blocks = await findOrgOwnershipBlocks(userId);
  if (blocks.length > 0) {
    throw new OrgOwnershipTransferRequiredError(blocks);
  }
}

export async function cascadeOwnedOrganizations(
  userId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const ownedOrgs = await tx.organization.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  for (const org of ownedOrgs) {
    await tx.entity.deleteMany({ where: { organizationId: org.id } });
    await tx.organizationMember.deleteMany({ where: { organizationId: org.id } });
    await tx.organization.delete({ where: { id: org.id } });
  }
}

export async function cascadeOwnedPersonalAccounts(
  userId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const owned = await tx.personalAccount.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  for (const pa of owned) {
    await tx.personalAccountMember.deleteMany({
      where: { personalAccountId: pa.id },
    });
    await tx.personalAccount.delete({ where: { id: pa.id } });
  }
}

/** Anonymise le compte (User row conservé) + cascade complète. */
export async function anonymizeUserDataCascade(
  userId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");

  await cascadeOwnedOrganizations(userId, tx);
  await cascadeOwnedPersonalAccounts(userId, tx);

  const entityRows = await tx.entity.findMany({
    where: { userId },
    select: { id: true },
  });
  const entityIds = entityRows.map((e) => e.id);

  if (entityIds.length > 0) {
    await tx.aIAlert.deleteMany({ where: { entityId: { in: entityIds } } });
    await tx.adminAlert.deleteMany({ where: { entityId: { in: entityIds } } });
  }

  await tx.interactionSignature.deleteMany({ where: { senderId: userId } });
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
