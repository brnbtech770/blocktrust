// lib/add-contact-trust-network.ts
// Après création d'un contact (Entity tiers) : Trust Circle ou invitation externe.
// ============================================================

import { prisma } from "@/app/lib/db";
import { checkTrustCircleQuota } from "@/lib/checkTrustCircleQuota";
import { tryPromoteMutualOnAdd } from "@/lib/trust-circle-mutual";
import { resolveEffectivePlan, planAllowsTrustCircle } from "@/lib/plan-features";
import { writeSecurityAuditLogFireAndForget } from "@/lib/security-audit";
import { normalizeEntityEmail } from "@/lib/entity-contacts";

export type ContactTrustEntityType = "INDIVIDUAL" | "BUSINESS" | "DOMAIN" | "EMAIL";

export type ContactTrustNetworkResult =
  | {
      ok: true;
      action: "mutual" | "trust_circle_invite" | "external_invite" | "contact_only";
      message: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
    };

function displayNameFromParts(
  entityType: ContactTrustEntityType,
  name: string,
): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 100) : entityType === "BUSINESS" ? "Entreprise" : "Contact";
}

/**
 * Relie un contact à Trust Circle (compte existant) ou envoie une invitation externe.
 * Ne crée jamais de certificat.
 */
export async function addContactToTrustNetwork(input: {
  fromUserId: string;
  fromUserEmail: string | null | undefined;
  fromUserName: string | null | undefined;
  contactEmail: string;
  contactName: string;
  entityType?: ContactTrustEntityType;
}): Promise<ContactTrustNetworkResult> {
  const emailNorm = normalizeEntityEmail(input.contactEmail);
  const selfEmail = input.fromUserEmail?.trim().toLowerCase();
  if (selfEmail && emailNorm === selfEmail) {
    return {
      ok: false,
      status: 400,
      code: "SELF_CONTACT",
      message: "Vous ne pouvez pas vous ajouter vous-même comme contact.",
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: input.fromUserId },
    select: { plan: true, status: true },
  });
  const plan = resolveEffectivePlan({
    subscription,
    email: input.fromUserEmail,
  });

  if (!planAllowsTrustCircle(plan)) {
    return {
      ok: true,
      action: "contact_only",
      message: "Contact enregistré. Le Trust Circle est disponible à partir du plan Premium.",
    };
  }

  const quota = await checkTrustCircleQuota(input.fromUserId, plan);
  if (!quota.allowed) {
    return {
      ok: false,
      status: 403,
      code: "QUOTA_EXCEEDED",
      message: `Limite Trust Circle atteinte pour le plan ${plan}.`,
    };
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      email: { equals: emailNorm, mode: "insensitive" },
      accountStatus: { not: "SUSPENDED" },
      NOT: { email: { startsWith: "deleted_" } },
    },
    select: { id: true },
  });

  if (targetUser) {
    const existing = await prisma.userTrustRelation.findFirst({
      where: {
        fromUserId: input.fromUserId,
        OR: [{ toUserId: targetUser.id }, { toEmail: emailNorm }],
      },
    });
    if (existing) {
      return {
        ok: true,
        action: "contact_only",
        message: "Contact enregistré — déjà présent dans votre Trust Circle.",
      };
    }
  }

  const entityType = input.entityType ?? "INDIVIDUAL";
  const toName = displayNameFromParts(entityType, input.contactName);
  const inviteToken = crypto.randomUUID();
  const inviteExpiry = new Date(Date.now() + (targetUser ? 7 : 30) * 24 * 3600 * 1000);

  const relation = await prisma.userTrustRelation.create({
    data: {
      fromUserId: input.fromUserId,
      toUserId: targetUser?.id ?? null,
      toEmail: emailNorm,
      toName,
      toEntityType: entityType,
      trustType: targetUser ? "UNILATERAL" : "UNVERIFIED",
      status: "PENDING",
      inviteToken,
      inviteExpiry,
      inviteSentAt: new Date(),
    },
  });

  if (targetUser) {
    const promoted = await tryPromoteMutualOnAdd({
      relationId: relation.id,
      fromUserId: input.fromUserId,
      toUserId: targetUser.id,
    });

    if (promoted) {
      const { sendMutualTrustEmail } = await import("@/lib/trust-circle-email");
      await sendMutualTrustEmail(input.fromUserId, targetUser.id).catch(console.error);
      writeSecurityAuditLogFireAndForget({
        action: "TRUST_CIRCLE_ADDED",
        userId: input.fromUserId,
        resource: "trust_circle",
        resourceId: targetUser.id,
        metadata: { trustType: "MUTUAL", source: "contact_create" },
      });
      return {
        ok: true,
        action: "mutual",
        message: "Contact ajouté — confiance mutuelle activée.",
      };
    }

    const { sendTrustCircleInviteEmail } = await import("@/lib/trust-circle-email");
    await sendTrustCircleInviteEmail(
      targetUser.id,
      input.fromUserId,
      input.fromUserName ?? "Un utilisateur BLOCKTRUST™",
      input.fromUserEmail ?? "",
      inviteToken,
    ).catch(console.error);

    writeSecurityAuditLogFireAndForget({
      action: "TRUST_CIRCLE_ADDED",
      userId: input.fromUserId,
      resource: "trust_circle",
      resourceId: targetUser.id,
      metadata: { trustType: "UNILATERAL", source: "contact_create" },
    });

    return {
      ok: true,
      action: "trust_circle_invite",
      message: "Contact ajouté — invitation Trust Circle envoyée.",
    };
  }

  const { sendTrustCircleExternalInviteEmail } = await import("@/lib/trust-circle-email");
  await sendTrustCircleExternalInviteEmail(
    emailNorm,
    toName,
    input.fromUserName ?? "Un utilisateur BLOCKTRUST™",
    inviteToken,
  ).catch(console.error);

  writeSecurityAuditLogFireAndForget({
    action: "TRUST_CIRCLE_ADDED",
    userId: input.fromUserId,
    resource: "trust_circle",
    resourceId: emailNorm,
    metadata: { trustType: "UNVERIFIED", source: "contact_create" },
  });

  return {
    ok: true,
    action: "external_invite",
    message: "Contact ajouté — invitation envoyée par email.",
  };
}
