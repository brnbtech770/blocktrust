// lib/extension-auth.ts
// Résolution utilisateur par clé API extension (hash stocké uniquement).
// ============================================================

import { prisma } from "@/app/lib/db";
import { hashApiKey, isValidExtensionApiKeyShape } from "@/lib/api-key";

export const EXTENSION_UNAUTHORIZED_BODY = {
  error: "unauthorized",
  message: "Requête non autorisée.",
} as const;

export async function findUserIdByExtensionApiKey(apiKey: string | null): Promise<string | null> {
  if (!apiKey?.trim() || !isValidExtensionApiKeyShape(apiKey)) return null;
  const extensionApiKeyHash = hashApiKey(apiKey);
  const user = await prisma.user.findFirst({
    where: { extensionApiKeyHash },
    select: { id: true },
  });
  return user?.id ?? null;
}
