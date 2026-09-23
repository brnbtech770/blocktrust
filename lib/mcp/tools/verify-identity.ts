// lib/mcp/tools/verify-identity.ts
// Tool verify_identity — réutilise runExtensionVerifySender.
// ============================================================

import { getEmailDomain } from "@/lib/signals/disposable-email";
import {
  runExtensionVerifySender,
  normalizeSenderEmail,
} from "@/lib/extension-verify-sender-service";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import { mcpAnchorResponse } from "@/lib/mcp/anchor-fields";
import type { McpToolContext } from "@/lib/mcp/types";
import { prisma } from "@/app/lib/db";
import { isDashboardAdmin } from "@/lib/admin-utils";

export async function handleVerifyIdentity(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const email = typeof args.email === "string" ? args.email.trim() : "";
  if (!email) {
    return mcpJsonResult({ error: "email requis." });
  }

  const domain = getEmailDomain(email) ?? "";
  const payload = await runExtensionVerifySender({
    userId: ctx.userId,
    emailRaw: email,
    domainRaw: domain,
  });

  const emailNorm = normalizeSenderEmail(email);
  const bisCapable = payload.status === "CERTIFIED";
  let anchorCert: Parameters<typeof mcpAnchorResponse>[1] = {
    blockchainStatus: payload.anchoredOnChain ? "ANCHORED" : "PENDING",
    polygonAnchoredAt: payload.anchoredAt,
  };
  if (isDashboardAdmin(ctx.userEmail) && payload.anchoredOnChain) {
    const entity = await prisma.entity.findFirst({
      where: {
        OR: [{ email: emailNorm }, { certifiedEmails: { has: emailNorm } }],
      },
      include: {
        certificates: {
          where: { status: { in: ["ACTIVE", "ANCHORED"] } },
          orderBy: { issuedAt: "desc" },
          take: 1,
        },
      },
    });
    if (entity?.certificates[0]) {
      anchorCert = entity.certificates[0];
    }
  }
  const anchor = mcpAnchorResponse(ctx, anchorCert);

  if (payload.status === "CERTIFIED" && payload.verified) {
    return mcpJsonResult({
      verified: true,
      verdict: "CERTIFIED",
      entityName: payload.entityName,
      email: emailNorm,
      domain: domain || null,
      website: null,
      trustScore: payload.trustScore,
      officialAccount: payload.officialAccount === true,
      trustLevel: "TRUST",
      kycStatus: payload.signals.kycVerified ? "VERIFIED" : "PENDING",
      ...anchor,
      signals: [
        { name: "Identité vérifiée", status: payload.signals.kycVerified },
        { name: "Ancrage blockchain", status: payload.signals.polygonAnchored },
        { name: "Dans votre réseau", status: payload.signals.inNetwork },
      ],
      bisCapable,
      senderUsuallySignsBis: payload.senderUsuallySignsBis,
      verifyUrl: payload.badgeUrl,
      message: payload.message,
    });
  }

  return mcpJsonResult({
    verified: false,
    verdict: payload.status === "FRAUD" ? "FRAUD" : "UNKNOWN",
    email: emailNorm,
    domain: domain || null,
    trustScore: payload.trustScore ?? 0,
    officialAccount: payload.officialAccount === true,
    trustLevel: payload.status === "FRAUD" ? "DANGER" : "UNKNOWN",
    entityName: payload.entityName,
    message: payload.message,
    bisCapable: false,
    ...anchor,
  });
}
