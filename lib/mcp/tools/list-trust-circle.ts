// lib/mcp/tools/list-trust-circle.ts
// Tool list_trust_circle — membres Trust Circle.
// ============================================================

import { prisma } from "@/app/lib/db";
import { normalizeSenderDomain } from "@/lib/extension-verify-sender";
import { runExtensionVerifySender } from "@/lib/extension-verify-sender-service";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

export async function handleListTrustCircle(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const limit =
    typeof args.limit === "number" && args.limit > 0
      ? Math.min(args.limit, 100)
      : 50;

  const relations = await prisma.userTrustRelation.findMany({
    where: {
      fromUserId: ctx.userId,
      OR: [{ isMutual: true }, { status: "CONFIRMED" }, { status: "PENDING" }],
    },
    include: {
      toUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const members = await Promise.all(
    relations.map(async (r) => {
      const email = (r.toEmail ?? r.toUser?.email ?? "").toLowerCase();
      const verify = email
        ? await runExtensionVerifySender({ userId: ctx.userId, emailRaw: email })
        : null;
      const domain = email.split("@")[1]
        ? normalizeSenderDomain(email.split("@")[1]!)
        : null;

      return {
        email,
        entityName: verify?.entityName ?? r.toName ?? r.toUser?.name ?? email,
        domain,
        website: domain ? `https://${domain}` : null,
        trustScore: verify?.trustScore ?? null,
        relationship: r.isMutual ? "MUTUAL" : r.trustType,
        status: r.status,
      };
    }),
  );

  return mcpJsonResult({
    total: members.length,
    members,
  });
}
