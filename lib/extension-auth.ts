// lib/extension-auth.ts
// Résolution utilisateur par clé API extension (hash stocké uniquement).
// ============================================================

import type { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import { hashApiKey, isValidExtensionApiKeyShape } from "@/lib/api-key";

export const EXTENSION_UNAUTHORIZED_BODY = {
  error: "unauthorized",
  message: "Requête non autorisée.",
} as const;

/**
 * Clé API extension depuis Authorization: Bearer … ou X-API-Key.
 * Jamais depuis la query string (fuite dans les access logs).
 */
export function extractExtensionApiKey(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization")?.trim();
  if (authorization) {
    const bearer = /^Bearer\s+(.+)$/i.exec(authorization);
    const token = bearer?.[1]?.trim();
    if (token) return token;
  }

  const headerKey = req.headers.get("x-api-key")?.trim();
  if (headerKey) return headerKey;

  return null;
}

export async function findUserIdByExtensionApiKey(apiKey: string | null): Promise<string | null> {
  if (!apiKey?.trim() || !isValidExtensionApiKeyShape(apiKey)) return null;
  const extensionApiKeyHash = hashApiKey(apiKey);
  const user = await prisma.user.findFirst({
    where: { extensionApiKeyHash },
    select: { id: true },
  });
  return user?.id ?? null;
}
