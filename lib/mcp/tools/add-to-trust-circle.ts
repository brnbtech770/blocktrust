// lib/mcp/tools/add-to-trust-circle.ts
// Tool add_to_trust_circle — logique /api/trust-circle/add.
// ============================================================

import { prisma } from "@/app/lib/db";
import { checkTrustCircleQuota } from "@/lib/checkTrustCircleQuota";
import { checkPlanRateLimit } from "@/lib/rate-limit-plan";
import { tryPromoteMutualOnAdd } from "@/lib/trust-circle-mutual";
import { runExtensionVerifySender } from "@/lib/extension-verify-sender-service";
import { mcpPlanAllowsTrustCircle } from "@/lib/mcp/helpers/plan-gates";
import { mcpErrorResult, mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

export async function handleAddToTrustCircle(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  if (!mcpPlanAllowsTrustCircle(ctx.plan)) {
    return mcpErrorResult("Le Trust Circle est disponible à partir du plan Premium.", {
      upgradeUrl: "https://blocktrust.tech/pricing",
    });
  }

  const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
  const relationshipArg =
    typeof args.relationship === "string" ? args.relationship.trim().toUpperCase() : "UNILATERAL";

  if (!email) {
    return mcpErrorResult("email requis.");
  }

  const rate = await checkPlanRateLimit("contacts", ctx.plan, ctx.userId);
  if (!rate.ok) {
    return mcpErrorResult("Trop d'ajouts de contacts.", { retryAfter: rate.retryAfter });
  }

  const quota = await checkTrustCircleQuota(ctx.userId, ctx.plan);
  if (!quota.allowed) {
    return mcpErrorResult(`Limite Trust Circle atteinte pour le plan ${ctx.plan}.`, {
      current: quota.current,
      limit: quota.limit,
      upgradeUrl: "https://blocktrust.tech/pricing",
    });
  }

  const targetUser = await prisma.user.findFirst({
    where: { email, kycStatus: "VERIFIED" },
    select: { id: true, name: true, email: true },
  });

  const verify = await runExtensionVerifySender({
    userId: ctx.userId,
    emailRaw: email,
  });

  const entityName = verify.entityName ?? targetUser?.name ?? email;

  if (targetUser) {
    const existing = await prisma.userTrustRelation.findFirst({
      where: { fromUserId: ctx.userId, toUserId: targetUser.id },
    });
    if (existing) {
      return mcpJsonResult({
        success: true,
        email,
        entityName,
        relationship: existing.isMutual ? "MUTUAL" : existing.trustType,
        message: "Relation déjà existante dans votre Trust Circle.",
        trustCircleSize: quota.current,
      });
    }
  } else {
    const existingEmail = await prisma.userTrustRelation.findFirst({
      where: { fromUserId: ctx.userId, toEmail: email },
    });
    if (existingEmail) {
      return mcpJsonResult({
        success: true,
        email,
        entityName,
        relationship: existingEmail.trustType,
        message: "Invitation déjà envoyée.",
        trustCircleSize: quota.current,
      });
    }
  }

  const inviteToken = crypto.randomUUID();
  const inviteExpiry = new Date(Date.now() + (targetUser ? 7 : 30) * 24 * 3600 * 1000);

  const relation = await prisma.userTrustRelation.create({
    data: {
      fromUserId: ctx.userId,
      toUserId: targetUser?.id ?? null,
      toEmail: email,
      toName: entityName,
      toEntityType: "INDIVIDUAL",
      trustType:
        relationshipArg === "MUTUAL" && targetUser
          ? "UNILATERAL"
          : relationshipArg === "MANUAL"
            ? "UNVERIFIED"
            : "UNILATERAL",
      status: "PENDING",
      inviteToken,
      inviteExpiry,
      inviteSentAt: new Date(),
    },
  });

  if (targetUser) {
    const promoted = await tryPromoteMutualOnAdd({
      relationId: relation.id,
      fromUserId: ctx.userId,
      toUserId: targetUser.id,
    });

    if (promoted) {
      const size = await prisma.userTrustRelation.count({
        where: {
          fromUserId: ctx.userId,
          OR: [{ isMutual: true }, { status: "CONFIRMED" }],
        },
      });

      return mcpJsonResult({
        success: true,
        email,
        entityName,
        relationship: "MUTUAL",
        trustScore: verify.trustScore,
        message: `${entityName} ajouté à votre Trust Circle. Relation mutuelle confirmée.`,
        trustCircleSize: size,
      });
    }
  }

  const size = await prisma.userTrustRelation.count({
    where: { fromUserId: ctx.userId },
  });

  return mcpJsonResult({
    success: true,
    email,
    entityName,
    relationship: targetUser ? "UNILATERAL" : "UNVERIFIED",
    trustScore: verify.trustScore,
    message: `Invitation Trust Circle envoyée à ${entityName}.`,
    trustCircleSize: size,
  });
}
