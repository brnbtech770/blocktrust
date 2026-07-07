// GET /api/extension/verify-sender
// TrustScan — vérifier un expéditeur (email + domaine) contre le registre BLOCKTRUST global.
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import { hashApiKey } from "@/lib/api-key";
import {
  findUserIdByExtensionApiKey,
  extractExtensionApiKey,
  EXTENSION_UNAUTHORIZED_BODY,
} from "@/lib/extension-auth";
import { normalizeSenderDomain, normalizeSenderEmail } from "@/lib/extension-verify-sender";
import { runExtensionVerifySender } from "@/lib/extension-verify-sender-service";
import { extensionJsonResponse, extensionOptionsResponse } from "@/lib/extension-cors";
import { checkPlanRateLimit } from "@/lib/rate-limit-plan";
import { resolveEffectivePlan } from "@/lib/plan-features";
import { getRedis } from "@/lib/rate-limit-redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return extensionOptionsResponse(req);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const apiKey = extractExtensionApiKey(req);
  const emailRaw = searchParams.get("email") ?? "";
  const domainRaw = searchParams.get("domain") ?? "";
  const bisIdRaw = searchParams.get("bisId")?.trim() ?? "";

  const userId = await findUserIdByExtensionApiKey(apiKey);
  if (!userId || !apiKey) {
    return extensionJsonResponse(req, EXTENSION_UNAUTHORIZED_BODY, 401);
  }

  const keyHash = hashApiKey(apiKey);
  const sub = await prisma.subscription
    .findUnique({ where: { userId }, select: { plan: true, status: true } })
    .catch(() => null);
  const planForTier = resolveEffectivePlan({ subscription: sub });
  const rate = await checkPlanRateLimit("extension", planForTier, keyHash);
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
      {
        error: "rate_limited",
        message: "Trop de requêtes. Réessayez plus tard.",
        retryAfter: rate.retryAfter,
      },
      429,
    );
  }

  const emailNorm = normalizeSenderEmail(emailRaw);
  const domainNorm = normalizeSenderDomain(domainRaw);
  const cacheKey =
    emailNorm || domainNorm
      ? `bt:ext:verify:v7:${userId}:${emailNorm}:${domainNorm}:${bisIdRaw || "-"}`
      : null;

  const redis = getRedis();
  if (redis && cacheKey) {
    try {
      const cached = await redis.get<string>(cacheKey);
      if (typeof cached === "string" && cached.length > 0) {
        const parsed = JSON.parse(cached);
        return extensionJsonResponse(req, parsed, 200);
      }
    } catch {
      /* fail-soft cache */
    }
  }

  const payload = await runExtensionVerifySender({
    userId,
    emailRaw,
    domainRaw,
    bisId: bisIdRaw || null,
  });

  if (redis && cacheKey) {
    try {
      await redis.set(cacheKey, JSON.stringify(payload), { ex: 300 });
    } catch {
      /* fail-soft */
    }
  }

  return extensionJsonResponse(req, payload, 200);
}
