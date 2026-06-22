// lib/mcp/tools/get-trust-score.ts
// Tool get_trust_score — Trust Engine V2 par email.
// ============================================================

import { prisma } from "@/app/lib/db";
import { computeTrustEngineScore } from "@/lib/trust-engine";
import { normalizeSenderEmail } from "@/lib/extension-verify-sender";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

export async function handleGetTrustScore(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const email = normalizeSenderEmail(typeof args.email === "string" ? args.email : "");
  if (!email) {
    return mcpJsonResult({ error: "email requis." });
  }

  const entity = await prisma.entity.findFirst({
    where: {
      OR: [
        { email, userId: ctx.userId },
        { certifiedEmails: { has: email } },
        { email, certificates: { some: { status: { in: ["ACTIVE", "ANCHORED"] } } } },
      ],
    },
    include: {
      certificates: {
        where: { status: { in: ["ACTIVE", "ANCHORED"] } },
        orderBy: { issuedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!entity) {
    return mcpJsonResult({
      email,
      trustScore: 0,
      recommendation: "DANGER",
      message: "Aucun certificat actif trouvé pour cet email.",
      subScores: null,
      bisActivity: { sent: 0, verified: 0 },
    });
  }

  const cert = entity.certificates[0];
  const certId = cert?.id ?? cert?.publicId;
  if (!certId || !cert) {
    return mcpJsonResult({
      email,
      trustScore: 0,
      recommendation: "DANGER",
      message: "Aucun certificat actif trouvé pour cet email.",
      subScores: null,
      bisActivity: { sent: 0, verified: 0 },
    });
  }

  const engine = await computeTrustEngineScore(certId, ctx.userId);
  const bisSent = await prisma.interactionSignature.count({
    where: { senderCertId: cert.id },
  });
  const bisVerified = await prisma.interactionSignature.count({
    where: { senderCertId: cert.id, verified: true },
  });

  return mcpJsonResult({
    email,
    trustScore: engine.globalScore,
    recommendation: engine.recommendation,
    contextLabel: engine.contextLabel,
    subScores: {
      identity: engine.identityScore,
      network: engine.networkScore,
      behavior: engine.behaviorScore,
      technical: engine.technicalScore,
    },
    signals: engine.signals.slice(0, 8),
    bisActivity: { sent: bisSent, verified: bisVerified },
  });
}
