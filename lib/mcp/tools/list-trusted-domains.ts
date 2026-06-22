// lib/mcp/tools/list-trusted-domains.ts
// Tool list_trusted_domains — domaines Trust Circle.
// ============================================================

import { prisma } from "@/app/lib/db";
import { normalizeSenderDomain } from "@/lib/extension-verify-sender";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

export async function handleListTrustedDomains(
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
      OR: [{ isMutual: true }, { status: "CONFIRMED" }],
    },
    select: { toUserId: true, toEmail: true, trustType: true, isMutual: true },
    take: limit * 2,
  });

  const partnerIds = [
    ...new Set(
      relations
        .map((r) => r.toUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const entities =
    partnerIds.length > 0
      ? await prisma.entity.findMany({
          where: { userId: { in: partnerIds } },
          select: {
            certifiedDomains: true,
            website: true,
            email: true,
            userId: true,
          },
        })
      : [];

  const domainMap = new Map<
    string,
    { website: string | null; entityCount: number; relationship: string }
  >();

  for (const rel of relations) {
    const relationship = rel.isMutual ? "MUTUAL" : rel.trustType;
    const relEntities = entities.filter((e) => e.userId === rel.toUserId);
    for (const e of relEntities) {
      const domains = new Set<string>();
      for (const d of e.certifiedDomains) {
        const n = normalizeSenderDomain(d);
        if (n) domains.add(n);
      }
      const emailDomain = e.email.split("@")[1];
      if (emailDomain) domains.add(normalizeSenderDomain(emailDomain));
      if (e.website) {
        const h = normalizeSenderDomain(e.website);
        if (h) domains.add(h);
      }
      for (const d of domains) {
        const existing = domainMap.get(d);
        if (existing) {
          existing.entityCount += 1;
        } else {
          domainMap.set(d, {
            website: e.website,
            entityCount: 1,
            relationship,
          });
        }
      }
    }
    if (rel.toEmail && relEntities.length === 0) {
      const d = rel.toEmail.split("@")[1];
      if (d) {
        const norm = normalizeSenderDomain(d);
        if (!domainMap.has(norm)) {
          domainMap.set(norm, { website: null, entityCount: 1, relationship });
        }
      }
    }
  }

  const domains = [...domainMap.entries()]
    .slice(0, limit)
    .map(([domain, meta]) => ({
      domain,
      website: meta.website,
      entityCount: meta.entityCount,
      relationship: meta.relationship,
    }));

  return mcpJsonResult({ domains, total: domains.length });
}
