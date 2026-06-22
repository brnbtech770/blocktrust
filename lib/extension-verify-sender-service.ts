// lib/extension-verify-sender-service.ts
// Logique verify-sender partagée (extension + MCP).
// ============================================================

import { prisma } from "@/app/lib/db";
import {
  buildExtensionVerifyResult,
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

  const userEmail = await prisma.user
    .findUnique({ where: { id: params.userId }, select: { email: true } })
    .then((u) => u?.email ?? null)
    .catch(() => null);

  const entityInclude = {
    certificates: { orderBy: { issuedAt: "desc" as const } },
    trustScore: { select: { score: true } },
  };

  const [userProfile, trustRelations, ownEntities] = await Promise.all([
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
  ]);

  const partnerUserIds = [
    ...new Set(
      trustRelations
        .map((r) => r.toUserId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const partnerEntities =
    partnerUserIds.length > 0
      ? await prisma.entity.findMany({
          where: { userId: { in: partnerUserIds } },
          include: entityInclude,
        })
      : [];

  const seenEntityIds = new Set(ownEntities.map((e) => e.id));
  const entities = [
    ...ownEntities,
    ...partnerEntities.filter((e) => {
      if (seenEntityIds.has(e.id)) return false;
      seenEntityIds.add(e.id);
      return true;
    }),
  ];

  const verifyContext: ExtensionVerifyContext = {
    userCertifiedEmails: userProfile?.certifiedEmails ?? [],
    userCertifiedDomains: userProfile?.certifiedDomains ?? [],
    trustRelationEmails: trustRelations
      .map((r) => r.toEmail)
      .filter((e): e is string => Boolean(e?.trim())),
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
