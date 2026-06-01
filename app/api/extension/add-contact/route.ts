// POST /api/extension/add-contact
// TrustScan — ajouter un contact (entité INDIVIDUAL minimale).
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import { hashApiKey } from "@/lib/api-key";
import { findUserIdByExtensionApiKey, EXTENSION_UNAUTHORIZED_BODY } from "@/lib/extension-auth";
import { getCorsHeaders, extensionJsonResponse } from "@/lib/extension-cors";
import { checkRateLimitExtensionAsync } from "@/lib/rate-limit-extension";
import { checkPlanRateLimit } from "@/lib/rate-limit-plan";
import { checkEntityQuota } from "@/lib/checkQuota";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  apiKey: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  domain: z.string().max(255).optional().default(""),
});

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: getCorsHeaders(req) });
}

function splitName(name: string): { firstName: string; lastName: string } {
  const t = name.trim();
  const sp = t.indexOf(" ");
  if (sp === -1) return { firstName: t || "Contact", lastName: "-" };
  return { firstName: t.slice(0, sp).trim(), lastName: t.slice(sp + 1).trim() || "-" };
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return extensionJsonResponse(req, { error: "invalid_body", message: "Corps JSON invalide." }, 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return extensionJsonResponse(
      req,
      { error: "validation_error", details: parsed.error.flatten() },
      400,
    );
  }

  const { apiKey, name, email, domain } = parsed.data;

  const userId = await findUserIdByExtensionApiKey(apiKey);
  if (!userId) {
    return extensionJsonResponse(req, EXTENSION_UNAUTHORIZED_BODY, 401);
  }

  const rate = await checkRateLimitExtensionAsync("write", hashApiKey(apiKey));
  if (!rate.ok) {
    return extensionJsonResponse(
      req,
      { error: "rate_limited", message: "Trop de requêtes.", retryAfter: rate.retryAfter },
      429,
    );
  }

  // Anti-Sybil (plan Découverte) : limite d'ajouts de contacts par tier.
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });
  const planRate = await checkPlanRateLimit("contacts", sub?.plan, userId);
  if (!planRate.ok) {
    return extensionJsonResponse(
      req,
      { error: "rate_limited", message: "Trop d’ajouts de contacts.", retryAfter: planRate.retryAfter },
      429,
    );
  }

  const quota = await checkEntityQuota(userId);
  if (!quota.allowed) {
    return extensionJsonResponse(
      req,
      {
        error: "quota_exceeded",
        message: quota.reason ?? "Limite de contacts atteinte.",
        current: quota.current,
        max: quota.max,
      },
      403,
    );
  }

  const emailLower = email.trim().toLowerCase();
  const existing = await prisma.entity.findFirst({
    where: { userId, email: emailLower, entityType: "INDIVIDUAL" },
    select: { id: true },
  });
  if (existing) {
    return extensionJsonResponse(req, { success: true, entityId: existing.id, existing: true }, 200);
  }

  const { firstName, lastName } = splitName(name);
  let website: string | null = null;
  const d = domain.trim().toLowerCase();
  if (d) {
    website = d.includes("://") ? d : `https://${d}`;
  }

  const entity = await prisma.entity.create({
    data: {
      userId,
      entityType: "INDIVIDUAL",
      firstName,
      lastName,
      email: emailLower,
      website,
      kycStatus: "PENDING",
      validationLevel: "BRONZE",
    },
    select: { id: true },
  });

  return extensionJsonResponse(req, { success: true, entityId: entity.id }, 201);
}
