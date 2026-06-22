// lib/mcp/tools/verify-website.ts
// Tool verify_website — légitimité URL + typosquatting.
// ============================================================

import { prisma } from "@/app/lib/db";
import { normalizeSenderDomain } from "@/lib/extension-verify-sender";
import {
  collectCertifiedDomainsGlobal,
  entityDisplayName,
  entityIsCertified,
} from "@/lib/mcp/helpers/contacts";
import { detectTyposquatting } from "@/lib/mcp/helpers/typosquatting";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

function parseUrlHost(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  try {
    const u = t.includes("://") ? new URL(t) : new URL(`https://${t}`);
    return normalizeSenderDomain(u.hostname);
  } catch {
    return normalizeSenderDomain(t);
  }
}

export async function handleVerifyWebsite(
  _ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const urlRaw = typeof args.url === "string" ? args.url : "";
  const host = parseUrlHost(urlRaw);
  if (!host) {
    return mcpJsonResult({ error: "url requis." });
  }

  const entities = await prisma.entity.findMany({
    where: {
      OR: [
        { certifiedDomains: { has: host } },
        { website: { contains: host, mode: "insensitive" } },
        { email: { endsWith: `@${host}`, mode: "insensitive" } },
      ],
      certificates: { some: { status: { in: ["ACTIVE", "ANCHORED"] } } },
    },
    include: {
      certificates: true,
      trustScore: { select: { score: true } },
    },
    take: 20,
  });

  const certified = entities.filter(entityIsCertified);
  const certifiedDomains = await collectCertifiedDomainsGlobal();
  const typosquat = detectTyposquatting(host, certifiedDomains);
  const owner = certified[0] ? entityDisplayName(certified[0]) : null;

  if (certified.length > 0) {
    return mcpJsonResult({
      legitimate: true,
      url: urlRaw,
      domain: host,
      owner,
      certified: true,
      trustScore: certified[0]?.trustScore?.score ?? null,
      phishingRisk: "LOW",
      typosquatting: { detected: false },
      message: "Site web associé à une entité certifiée BLOCKTRUST.",
    });
  }

  const phishingRisk = typosquat.detected ? "HIGH" : "MEDIUM";

  return mcpJsonResult({
    legitimate: false,
    url: urlRaw,
    domain: host,
    owner: null,
    certified: false,
    phishingRisk,
    typosquatting: typosquat,
    certifiedAlternative: typosquat.similarTo
      ? {
          domain: typosquat.similarTo,
          website: `https://${typosquat.similarTo}`,
        }
      : null,
    message: typosquat.detected
      ? `Risque de typosquatting détecté — le domaine légitime pourrait être ${typosquat.similarTo}.`
      : "Aucune entité certifiée BLOCKTRUST associée à ce site.",
  });
}
