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
} from "@/lib/extension-verify-sender";
import { extensionCorsHeaders, extensionJsonResponse } from "@/lib/extension-cors";
import { checkRateLimitExtensionAsync } from "@/lib/rate-limit-extension";
import { redis } from "@/lib/rate-limit-redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  "https://blocktrust.tech";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCorsHeaders(req) });
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
      ? `bt:ext:verify:v1:${userId}:${emailNorm}:${domainNorm}`
      : null;

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

  const entities = await prisma.entity.findMany({
    where: { userId },
    include: {
      certificates: { orderBy: { issuedAt: "desc" } },
      trustScore: { select: { score: true } },
    },
  });

  const payload = buildExtensionVerifyResult(entities, emailRaw, domainRaw, BASE_URL);

  if (redis && cacheKey) {
    try {
      await redis.set(cacheKey, JSON.stringify(payload), { ex: 3600 });
    } catch {
      /* fail-soft */
    }
  }

  return extensionJsonResponse(req, payload, 200);
}
