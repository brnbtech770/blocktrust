// GET /api/extension/api-key
// Génère ou indique l’état de la clé API extension (session NextAuth uniquement).
// La clé secrète complète n’est renvoyée qu’à la première création (jamais stockée en clair en DB).
// ============================================================

import { NextRequest } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { generateExtensionApiKey } from "@/lib/api-key";
import {
  canEncryptExtensionApiKey,
  decryptExtensionApiKey,
  encryptExtensionApiKey,
} from "@/lib/extension-api-key-crypto";
import { extensionJsonResponse, extensionOptionsResponse } from "@/lib/extension-cors";
import { checkRateLimitExtensionAsync } from "@/lib/rate-limit-extension";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postBodySchema = z.object({
  action: z.enum(["regenerate", "reveal"]),
});

export async function OPTIONS(req: NextRequest) {
  return extensionOptionsResponse(req);
}

async function writeNewExtensionKey(userId: string): Promise<
  | { ok: true; apiKey: string; masked: string }
  | { ok: false; error: string }
> {
  if (!canEncryptExtensionApiKey()) {
    return { ok: false, error: "Configuration serveur incomplète." };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const { apiKey, apiKeyHash, maskedDisplay } = generateExtensionApiKey();
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          extensionApiKeyHash: apiKeyHash,
          extensionApiKey: maskedDisplay,
          extensionApiKeyEnc: encryptExtensionApiKey(apiKey),
        },
      });
      void prisma.auditLog
        .create({
          data: {
            action: "EXTENSION_API_KEY_CREATED",
            resource: "user",
            resourceId: userId,
            userId,
          },
        })
        .catch(() => null);
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
        "Une clé existe déjà pour ce compte. Utilisez « Copier la clé » sur la page Extension Chrome.",
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

  if (parsed.data.action === "reveal") {
    const revealRate = await checkRateLimitExtensionAsync("reveal", session.user.id);
    if (!revealRate.ok) {
      return extensionJsonResponse(
        req,
        { error: "rate_limited", message: "Trop de requêtes.", retryAfter: revealRate.retryAfter },
        429,
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { extensionApiKeyHash: true, extensionApiKey: true, extensionApiKeyEnc: true },
    });

    if (!existing?.extensionApiKeyHash) {
      return extensionJsonResponse(req, { error: "not_found", message: "Aucune clé API active." }, 404);
    }

    if (!existing.extensionApiKeyEnc) {
      return extensionJsonResponse(req, {
        error: "legacy_key",
        hasKey: true,
        masked: existing.extensionApiKey ?? null,
        canReveal: false,
        message:
          "Cette clé a été créée avant la fonctionnalité de réaffichage. Régénérez-la une fois pour pouvoir la revoir ensuite.",
      }, 409);
    }

    const apiKey = decryptExtensionApiKey(existing.extensionApiKeyEnc);
    if (!apiKey) {
      return extensionJsonResponse(req, { error: "server_error", message: "Impossible de déchiffrer la clé." }, 500);
    }

    void prisma.auditLog
      .create({
        data: {
          action: "EXTENSION_API_KEY_REVEALED",
          resource: "user",
          resourceId: session.user.id,
          userId: session.user.id,
        },
      })
      .catch(() => null);

    return extensionJsonResponse(req, {
      hasKey: true,
      apiKey,
      masked: existing.extensionApiKey ?? null,
      canReveal: true,
    });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { extensionApiKeyHash: null, extensionApiKey: null, extensionApiKeyEnc: null },
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
