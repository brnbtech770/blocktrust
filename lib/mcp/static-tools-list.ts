// lib/mcp/static-tools-list.ts
// Réponse tools/list statique — aucun appel DB / Redis / réseau.
// ============================================================

import { MCP_TOOL_DEFINITIONS } from "@/lib/mcp/tool-definitions";
import type { JsonRpcId } from "@/lib/mcp/types";

const STATIC_TOOLS_LIST_RESULT = {
  tools: MCP_TOOL_DEFINITIONS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
} as const;

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
};

function normalizeMessages(parsedBody: unknown): JsonRpcMessage[] {
  if (parsedBody === null || parsedBody === undefined) return [];
  return Array.isArray(parsedBody) ? parsedBody : [parsedBody];
}

/** True si le corps POST ne contient que des requêtes tools/list. */
export function isStaticToolsListRequest(parsedBody: unknown): boolean {
  const messages = normalizeMessages(parsedBody);
  if (messages.length === 0) return false;
  return messages.every((m) => m.method === "tools/list");
}

/** Construit la réponse HTTP JSON-RPC pour tools/list (batch ou message unique). */
export function buildStaticToolsListHttpResponse(parsedBody: unknown): Response {
  const messages = normalizeMessages(parsedBody);
  const payload = messages.map((m) => ({
    jsonrpc: "2.0" as const,
    id: m.id ?? null,
    result: STATIC_TOOLS_LIST_RESULT,
  }));
  const body = payload.length === 1 ? payload[0] : payload;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
