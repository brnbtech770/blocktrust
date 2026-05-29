// GET /api/extension/verify-sender
// TrustScan — vérifier un expéditeur (email + domaine) contre les contacts de l’utilisateur.
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import { hashApiKey } from "@/lib/api-key";
import { findUserIdByExtensionApiKey, EXTENSION_UNAUTHORIZED_BODY } from "@/lib/extension-auth";
import {
  buildExtensionVerifyResult,
  normalizeSenderDomain,
  normalizeSenderEmail,
  type ExtensionVerifyContext,
} from "@/lib/extension-verify-sender";
import { getCorsHeaders, extensionJsonResponse } from "@/lib/extension-cors";
import { checkRateLimitExtensionAsync } from "@/lib/rate-limit-extension";
import { getRedis } from "@/lib/rate-limit-redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  "https://blocktrust.tech";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const apiKey = searchParams.get("apiKey");
  const emailRaw = searchParams.get("email") ?? "";
  const domainRaw = searchParams.get("domain") ?? "";

  const userId = await findUserIdByExtensionApiKey(apiKey);
  if (!userId) {
    return extensionJsonResponse(req, EXTENSION_UNAUTHORIZED_BODY, 401);
  }

  const keyHash = hashApiKey(apiKey!);
  const rate = await checkRateLimitExtensionAsync("verify", keyHash);
  if (!rate.ok) {
    void prisma.auditLog
      .create({
        data: {
          action: "EXTENSION_RATE_LIMIT",
          resource: "extension",
          resourceId: keyHash,
          userId,
        },
      })
      .catch(() => null);
    return extensionJsonResponse(
      req,
      { error: "rate_limited", message: "Trop de requêtes. Réessayez plus tard.", retryAfter: rate.retryAfter },
      429,
    );
  }

  const emailNorm = normalizeSenderEmail(emailRaw);
  const domainNorm = normalizeSenderDomain(domainRaw);
  const cacheKey =
    emailNorm || domainNorm
      ? `bt:ext:verify:v3:${userId}:${emailNorm}:${domainNorm}`
      : null;

  const redis = getRedis();
  if (redis && cacheKey) {
    try {
      const cached = await redis.get<string>(cacheKey);
      if (typeof cached === "string" && cached.length > 0) {
        const parsed = JSON.parse(cached) as ReturnType<typeof buildExtensionVerifyResult>;
        return extensionJsonResponse(req, parsed, 200);
      }
    } catch {
      /* fail-soft cache */
    }
  }

  const entityInclude = {
    certificates: { orderBy: { issuedAt: "desc" as const } },
    trustScore: { select: { score: true } },
  };

  const [userProfile, trustRelations, ownEntities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { certifiedEmails: true, certifiedDomains: true },
    }),
    prisma.userTrustRelation.findMany({
      where: {
        fromUserId: userId,
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      select: { toUserId: true, toEmail: true },
    }),
    prisma.entity.findMany({
      where: { userId },
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

  const payload = buildExtensionVerifyResult(
    entities,
    emailRaw,
    domainRaw,
    BASE_URL,
    verifyContext,
  );

  if (redis && cacheKey) {
    try {
      await redis.set(cacheKey, JSON.stringify(payload), { ex: 3600 });
    } catch {
      /* fail-soft */
    }
  }

  return extensionJsonResponse(req, payload, 200);
}
