// lib/mcp/tools/verify-identity.ts
// Tool verify_identity — réutilise runExtensionVerifySender.
// ============================================================

import { getEmailDomain } from "@/lib/signals/disposable-email";
import {
  runExtensionVerifySender,
  normalizeSenderEmail,
} from "@/lib/extension-verify-sender-service";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

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
      anchored: payload.anchoredOnChain,
      signals: [
        { name: "Identité vérifiée", status: payload.signals.kycVerified },
        { name: "Ancrage blockchain", status: payload.signals.polygonAnchored },
        { name: "Domaine vérifié", status: payload.signals.inNetwork },
        { name: "Réseau de confiance", status: payload.signals.inNetwork },
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
    anchored: payload.anchoredOnChain,
  });
}
