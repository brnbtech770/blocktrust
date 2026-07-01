// lib/extension-verify-sender-service.ts
// Logique verify-sender partagée (extension + MCP).
// ============================================================

import type { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/db";
import {
  buildExtensionVerifyResult,
  collectContactEntityKeys,
  entityMatchesSender,
  normalizeSenderDomain,
  normalizeSenderEmail,
  type ExtensionVerifyContext,
  type ExtensionVerifyPayload,
} from "@/lib/extension-verify-sender";
import { enrichExtensionPayloadWithBis } from "@/lib/extension-bis-enrichment";

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  "https://blocktrust.tech";

const entityInclude = {
  certificates: { take: 1, orderBy: { issuedAt: "desc" as const } },
  trustScore: { select: { score: true } },
};

type EntityWithCerts = Prisma.EntityGetPayload<{ include: typeof entityInclude }>;

/** Recherche globale d'entités certifiées correspondant à l'expéditeur. */
export async function findGlobalEntitiesMatchingSender(
  emailNorm: string,
  domainNorm: string,
  limit = 25,
): Promise<EntityWithCerts[]> {
  if (!emailNorm && !domainNorm) return [];

  const or: Prisma.EntityWhereInput[] = [];
  if (emailNorm) {
    or.push({ email: { equals: emailNorm, mode: "insensitive" } });
    or.push({ certifiedEmails: { has: emailNorm } });
  }
  if (domainNorm) {
    or.push({ certifiedDomains: { has: domainNorm } });
    or.push({ website: { contains: domainNorm, mode: "insensitive" } });
  }
  if (or.length === 0) return [];

  const candidates = await prisma.entity.findMany({
    where: { OR: or },
    include: entityInclude,
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return candidates.filter((e) => entityMatchesSender(e, emailNorm, domainNorm));
}

function mergeEntities(
  primary: EntityWithCerts[],
  extra: EntityWithCerts[],
): EntityWithCerts[] {
  const seen = new Set(primary.map((e) => e.id));
  const merged = [...primary];
  for (const e of extra) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    merged.push(e);
  }
  return merged;
}

export async function runExtensionVerifySender(params: {
  userId: string;
  emailRaw: string;
  domainRaw?: string;
  bisId?: string | null;
  baseUrl?: string;
}): Promise<ExtensionVerifyPayload> {
  const baseUrl = params.baseUrl ?? DEFAULT_BASE_URL;
  const emailRaw = params.emailRaw;
  const domainRaw = params.domainRaw ?? "";
  const bisIdRaw = params.bisId?.trim() ?? "";
  const emailNorm = normalizeSenderEmail(emailRaw);
  const domainNorm = normalizeSenderDomain(domainRaw);

  const userEmail = await prisma.user
    .findUnique({ where: { id: params.userId }, select: { email: true } })
    .then((u) => u?.email ?? null)
    .catch(() => null);

  const [userProfile, trustRelations, ownEntities, globalEntities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.userId },
      select: { certifiedEmails: true, certifiedDomains: true },
    }),
    prisma.userTrustRelation.findMany({
      where: {
        fromUserId: params.userId,
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      select: { toUserId: true, toEmail: true },
    }),
    prisma.entity.findMany({
      where: { userId: params.userId },
      include: entityInclude,
    }),
    findGlobalEntitiesMatchingSender(emailNorm, domainNorm),
  ]);

  const entities = mergeEntities(globalEntities, ownEntities);
  const contactKeys = collectContactEntityKeys(ownEntities);

  const verifyContext: ExtensionVerifyContext = {
    userCertifiedEmails: userProfile?.certifiedEmails ?? [],
    userCertifiedDomains: userProfile?.certifiedDomains ?? [],
    trustRelationEmails: trustRelations
      .map((r) => r.toEmail)
      .filter((e): e is string => Boolean(e?.trim())),
    contactEntityEmails: contactKeys.emails,
    contactEntityDomains: contactKeys.domains,
  };

  const payload = await enrichExtensionPayloadWithBis({
    payload: buildExtensionVerifyResult(
      entities,
      emailRaw,
      domainRaw,
      baseUrl,
      verifyContext,
    ),
    bisId: bisIdRaw || null,
    recipientEmail: userEmail,
    senderEmail: emailRaw,
  });

  return payload;
}

export { normalizeSenderEmail, normalizeSenderDomain };
