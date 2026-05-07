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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: extensionCorsHeaders(req) });
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
        "Une clé existe déjà pour ce compte. Elle ne peut être réaffichée. Contactez le support pour une rotation.",
    });
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const { apiKey, apiKeyHash, maskedDisplay } = generateExtensionApiKey();
    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          extensionApiKeyHash: apiKeyHash,
          extensionApiKey: maskedDisplay,
        },
      });
      return extensionJsonResponse(req, {
        hasKey: false,
        apiKey,
        masked: maskedDisplay,
        message: "Enregistrez cette clé immédiatement : elle ne sera plus affichée intégralement.",
      });
    } catch {
      /* collision rare sur maskedDisplay unique */
    }
  }

  return extensionJsonResponse(req, { error: "server_error", message: "Impossible de générer une clé." }, 500);
}
