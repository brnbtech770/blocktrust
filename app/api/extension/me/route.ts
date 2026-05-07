// GET /api/extension/me
// TrustScan — métadonnées utilisateur pour l’extension.
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import { hashApiKey } from "@/lib/api-key";
import { findUserIdByExtensionApiKey, EXTENSION_UNAUTHORIZED_BODY } from "@/lib/extension-auth";
import { extensionCorsHeaders, extensionJsonResponse } from "@/lib/extension-cors";
import { checkRateLimitExtensionAsync } from "@/lib/rate-limit-extension";
import { getEntityQuotaSnapshot } from "@/lib/checkQuota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const apiKey = req.nextUrl.searchParams.get("apiKey");
  const userId = await findUserIdByExtensionApiKey(apiKey);
  if (!userId) {
    return extensionJsonResponse(req, EXTENSION_UNAUTHORIZED_BODY, 401);
  }

  const rate = await checkRateLimitExtensionAsync("me", hashApiKey(apiKey!));
  if (!rate.ok) {
    return extensionJsonResponse(
      req,
      { error: "rate_limited", message: "Trop de requêtes.", retryAfter: rate.retryAfter },
      429,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, trustScore: true, subscription: { select: { plan: true } } },
  });
  if (!user) {
    return extensionJsonResponse(req, EXTENSION_UNAUTHORIZED_BODY, 401);
  }

  const snap = await getEntityQuotaSnapshot(userId);

  return extensionJsonResponse(req, {
    name: user.name ?? "",
    plan: snap?.plan ?? user.subscription?.plan ?? "ESSENTIEL",
    trustScore: user.trustScore,
    contactsCount: snap?.current ?? 0,
    contactsLimit: snap?.max ?? 20,
  });
}
