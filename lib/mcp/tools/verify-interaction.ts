// lib/mcp/tools/verify-interaction.ts
// Tool verify_interaction — BIS public verify.
// ============================================================

import { prisma } from "@/app/lib/db";
import { getPublicBisVerification } from "@/lib/bis-public-verify";
import { verifyBisSignature } from "@/lib/bis-sign";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

export async function handleVerifyInteraction(
  _ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const bisId = typeof args.bisId === "string" ? args.bisId.trim() : "";
  if (!bisId) {
    return mcpJsonResult({ error: "bisId requis." });
  }

  const publicResult = await getPublicBisVerification(bisId);
  if (!publicResult) {
    return mcpJsonResult({
      valid: false,
      reason: "Signature introuvable.",
    });
  }

  const record = await prisma.interactionSignature.findUnique({
    where: { id: bisId },
    select: {
      senderEmail: true,
      recipientEmail: true,
      interactionType: true,
      contextLabel: true,
      signature: true,
      createdAt: true,
    },
  });

  let sender = record?.senderEmail ?? null;
  let recipient = record?.recipientEmail ?? null;
  if (record?.signature) {
    const crypto = await verifyBisSignature(record.signature);
    if (crypto.valid) {
      sender = crypto.sender;
      recipient = crypto.recipient;
    }
  }

  return mcpJsonResult({
    valid: publicResult.valid,
    bisLevel: publicResult.bisLevel,
    sender,
    recipient,
    type: publicResult.interactionType,
    context: publicResult.contextLabel,
    signedAt: publicResult.signedAt,
    expiresAt: publicResult.expiresAt,
    reason: publicResult.reason,
  });
}
