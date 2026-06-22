// lib/mcp/auth.ts
// Authentification MCP — clé API extension bt_ext_…
// ============================================================

import type { NextRequest } from "next/server";
import {
  extractExtensionApiKey,
  findUserIdByExtensionApiKey,
} from "@/lib/extension-auth";
import { hashApiKey } from "@/lib/api-key";
import type { McpAuthResult } from "@/lib/mcp/types";

export async function authenticateMcpRequest(
  req: NextRequest | Request,
): Promise<McpAuthResult> {
  const authorization = req.headers.get("authorization")?.trim();
  const xApiKey = req.headers.get("x-api-key")?.trim();

  let apiKey: string | null = null;
  if (authorization) {
    const bearer = /^Bearer\s+(.+)$/i.exec(authorization);
    apiKey = bearer?.[1]?.trim() ?? null;
  }
  if (!apiKey && xApiKey) apiKey = xApiKey;

  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      message: "Authorization: Bearer bt_ext_… requis.",
    };
  }

  const userId = await findUserIdByExtensionApiKey(apiKey);
  if (!userId) {
    return {
      ok: false,
      status: 401,
      message: "Clé API invalide ou révoquée.",
    };
  }

  return { ok: true, userId, keyHash: hashApiKey(apiKey) };
}

/** Alias pour les routes Next.js (Request standard). */
export async function authenticateMcpFromHeaders(
  headers: Headers,
): Promise<McpAuthResult> {
  const req = new Request("https://blocktrust.tech/mcp/sse", { headers });
  return authenticateMcpRequest(req);
}

export { extractExtensionApiKey };
