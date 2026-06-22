// lib/mcp/tools/verify-domain.ts
// Tool verify_domain — entités certifiées + signaux domaine.
// ============================================================

import { prisma } from "@/app/lib/db";
import { getDomainAge } from "@/lib/signals/domain-age";
import { isDisposableEmail } from "@/lib/signals/disposable-email";
import { normalizeSenderDomain } from "@/lib/extension-verify-sender";
import {
  collectCertifiedDomainsGlobal,
  entityDisplayName,
  entityIsCertified,
} from "@/lib/mcp/helpers/contacts";
import {
  detectTyposquatting,
  findSimilarCertifiedDomains,
} from "@/lib/mcp/helpers/typosquatting";
import { formatDomainAge } from "@/lib/mcp/helpers/domain-dns";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

export async function handleVerifyDomain(
  _ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const domain = normalizeSenderDomain(typeof args.domain === "string" ? args.domain : "");
  if (!domain) {
    return mcpJsonResult({ error: "domain requis." });
  }

  const entities = await prisma.entity.findMany({
    where: {
      OR: [
        { certifiedDomains: { has: domain } },
        { email: { endsWith: `@${domain}`, mode: "insensitive" } },
        { website: { contains: domain, mode: "insensitive" } },
      ],
      certificates: { some: { status: { in: ["ACTIVE", "ANCHORED"] } } },
    },
    include: {
      certificates: { orderBy: { issuedAt: "desc" } },
      trustScore: { select: { score: true } },
    },
    take: 50,
  });

  const certifiedEntities = entities.filter(entityIsCertified);
  const domainAge = await getDomainAge(domain).catch(() => ({ agedays: -1, suspicious: false }));
  const disposable = isDisposableEmail(`probe@${domain}`);
  const certifiedDomains = await collectCertifiedDomainsGlobal();
  const typosquat = detectTyposquatting(domain, certifiedDomains);

  const website =
    certifiedEntities.find((e) => e.website)?.website ??
    (certifiedEntities.length > 0 ? `https://${domain}` : null);

  if (certifiedEntities.length === 0) {
    const similar = findSimilarCertifiedDomains(domain, certifiedDomains);
    return mcpJsonResult({
      certified: false,
      domain,
      entityCount: 0,
      domainAge: formatDomainAge(domainAge.agedays),
      disposable,
      typosquatting: typosquat,
      warning: similar[0]
        ? `Ce domaine n'est associé à aucune entité certifiée. Le domaine certifié le plus proche est ${similar[0]}.`
        : "Ce domaine n'est associé à aucune entité certifiée BLOCKTRUST.",
      similarCertifiedDomains: similar,
    });
  }

  const scores = certifiedEntities
    .map((e) => e.trustScore?.score)
    .filter((s): s is number => typeof s === "number");
  const trustScoreAvg =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;

  const anchored = certifiedEntities.some((e) =>
    e.certificates.some(
      (c) => c.blockchainStatus === "ANCHORED" || c.status === "ANCHORED" || Boolean(c.polygonTxHash),
    ),
  );

  return mcpJsonResult({
    certified: true,
    domain,
    entityCount: certifiedEntities.length,
    entities: certifiedEntities.map((e) => ({
      name: entityDisplayName(e),
      email: e.email,
      trustScore: e.trustScore?.score ?? null,
      type: e.entityType,
      role: e.tradeName ?? null,
    })),
    domainAge: formatDomainAge(domainAge.agedays),
    domainCreated: domainAge.agedays >= 0
      ? new Date(Date.now() - domainAge.agedays * 86400000).toISOString().slice(0, 10)
      : null,
    disposable,
    trustScoreAvg,
    anchored,
    website,
    websiteCertified: Boolean(website),
    typosquatting: typosquat,
  });
}
