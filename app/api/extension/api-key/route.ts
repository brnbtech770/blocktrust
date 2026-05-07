// GET /api/extension/api-key
// Génère ou indique l’état de la clé API extension (session NextAuth uniquement).
// La clé secrète complète n’est renvoyée qu’à la première création (jamais stockée en clair en DB).
// ============================================================

import { NextRequest } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { generateExtensionApiKey } from "@/lib/api-key";
import { extensionCorsHeaders, extensionJsonResponse } from "@/lib/extension-cors";
import { checkRateLimitExtensionAsync } from "@/lib/rate-limit-extension";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postBodySchema = z.object({
  action: z.literal("regenerate"),
});

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCorsHeaders(req) });
}

async function writeNewExtensionKey(userId: string): Promise<
  | { ok: true; apiKey: string; masked: string }
  | { ok: false; error: string }
> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { apiKey, apiKeyHash, maskedDisplay } = generateExtensionApiKey();
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          extensionApiKeyHash: apiKeyHash,
          extensionApiKey: maskedDisplay,
        },
      });
      return { ok: true, apiKey, masked: maskedDisplay };
    } catch {
      /* collision rare sur maskedDisplay unique */
    }
  }
  return { ok: false, error: "Impossible de générer une clé." };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return extensionJsonResponse(req, { error: "unauthorized", message: "Connexion requise." }, 401);
  }

  const rate = await checkRateLimitExtensionAsync("keygen", session.user.id);
  if (!rate.ok) {
    return extensionJsonResponse(
      req,
      { error: "rate_limited", message: "Trop de requêtes.", retryAfter: rate.retryAfter },
      429,
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { extensionApiKeyHash: true, extensionApiKey: true },
  });

  if (existing?.extensionApiKeyHash) {
    return extensionJsonResponse(req, {
      hasKey: true,
      apiKey: null,
      masked: existing.extensionApiKey ?? null,
      message:
        "Une clé existe déjà pour ce compte. Elle ne peut être réaffichée. Utilisez « Régénérer la clé » dans Paramètres si vous devez en créer une nouvelle.",
    });
  }

  const created = await writeNewExtensionKey(session.user.id);
  if (!created.ok) {
    return extensionJsonResponse(req, { error: "server_error", message: created.error }, 500);
  }

  return extensionJsonResponse(req, {
    hasKey: false,
    apiKey: created.apiKey,
    masked: created.masked,
    message: "Enregistrez cette clé immédiatement : elle ne sera plus affichée intégralement.",
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return extensionJsonResponse(req, { error: "unauthorized", message: "Connexion requise." }, 401);
  }

  const rate = await checkRateLimitExtensionAsync("keygen", session.user.id);
  if (!rate.ok) {
    return extensionJsonResponse(
      req,
      { error: "rate_limited", message: "Trop de requêtes.", retryAfter: rate.retryAfter },
      429,
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return extensionJsonResponse(req, { error: "invalid_body", message: "Corps JSON invalide." }, 400);
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return extensionJsonResponse(req, { error: "validation_error", message: "Action non reconnue." }, 400);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { extensionApiKeyHash: null, extensionApiKey: null },
  });

  const created = await writeNewExtensionKey(session.user.id);
  if (!created.ok) {
    return extensionJsonResponse(req, { error: "server_error", message: created.error }, 500);
  }

  return extensionJsonResponse(req, {
    hasKey: true,
    apiKey: created.apiKey,
    masked: created.masked,
    regenerated: true,
    message:
      "Ancienne clé révoquée. Enregistrez la nouvelle clé immédiatement — elle ne sera plus affichée intégralement.",
  });
}
