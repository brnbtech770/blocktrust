// lib/mcp/tools/sign-interaction.ts
// Tool sign_interaction — createBisSignature (plan payant + cert ancré).
// ============================================================

import {
  BisSignError,
  createBisSignature,
  resolveSenderBisCertificate,
} from "@/lib/bis-sign";
import {
  BIS_INTERACTION_TYPES,
  isValidContentHash,
  normalizeEmail,
  type BisInteractionType,
} from "@/lib/bis-access";
import { assertSafeDisplayText } from "@/lib/sanitize-display-text";
import { mcpErrorResult, mcpJsonResult } from "@/lib/mcp/sanitize-output";
import { mcpPlanAllowsBisSign } from "@/lib/mcp/helpers/plan-gates";
import type { McpToolContext } from "@/lib/mcp/types";

export async function handleSignInteraction(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  if (!mcpPlanAllowsBisSign(ctx.plan)) {
    return mcpErrorResult(
      "Signature BIS disponible à partir d'un plan payant avec certificat ancré.",
      { upgradeUrl: "https://blocktrust.tech/pricing" },
    );
  }

  if (!ctx.userEmail) {
    return mcpErrorResult("Email utilisateur introuvable.");
  }

  const recipientEmail =
    typeof args.recipientEmail === "string" ? args.recipientEmail.trim() : "";
  const interactionType =
    typeof args.interactionType === "string" ? args.interactionType.trim() : "";
  const contentHash =
    typeof args.contentHash === "string" ? args.contentHash.trim().toLowerCase() : "";
  const contextLabel =
    typeof args.contextLabel === "string" ? args.contextLabel.trim() : undefined;

  if (!recipientEmail || !interactionType || !contentHash) {
    return mcpErrorResult("recipientEmail, interactionType et contentHash requis.");
  }

  if (
    !BIS_INTERACTION_TYPES.includes(interactionType as BisInteractionType)
  ) {
    return mcpErrorResult(`interactionType invalide. Valeurs : ${BIS_INTERACTION_TYPES.join(", ")}`);
  }

  if (!isValidContentHash(contentHash)) {
    return mcpErrorResult("contentHash doit être un SHA-256 hex (64 caractères).");
  }

  let safeContext: string | undefined;
  if (contextLabel) {
    const check = assertSafeDisplayText(contextLabel, "Contexte");
    if (!check.ok) return mcpErrorResult(check.reason);
    safeContext = check.value;
  }

  const senderCert = await resolveSenderBisCertificate(ctx.userId);
  if (!senderCert) {
    return mcpErrorResult(
      "Certificat actif ancré requis — disponible à partir de Premium ou plans professionnels.",
      { upgradeUrl: "https://blocktrust.tech/pricing" },
    );
  }

  try {
    const result = await createBisSignature({
      senderId: ctx.userId,
      senderCertId: senderCert.id,
      senderEmail: ctx.userEmail,
      recipientEmail: normalizeEmail(recipientEmail),
      interactionType: interactionType as BisInteractionType,
      contextLabel: safeContext,
      contentHash,
    });

    return mcpJsonResult({
      signatureId: result.signatureId,
      verifyUrl: result.verifyUrl,
      expiresAt: result.expiresAt,
      bisLevel: result.bisLevel,
    });
  } catch (error) {
    if (error instanceof BisSignError) {
      return mcpErrorResult(error.message);
    }
    return mcpErrorResult("Erreur lors de la signature BIS.");
  }
}
