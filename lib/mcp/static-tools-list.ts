// lib/mcp/static-tools-list.ts
// Réponse tools/list statique — aucun appel DB / Redis / réseau.
// Format Streamable HTTP (SSE) quand le client accepte text/event-stream.
// ============================================================

import { MCP_TOOL_DEFINITIONS } from "@/lib/mcp/tool-definitions";
import type { JsonRpcId } from "@/lib/mcp/types";

const STATIC_TOOLS_LIST_RESULT = {
  tools: MCP_TOOL_DEFINITIONS.map(({ name, description, inputSchema, annotations }) => ({
    name,
    description,
    inputSchema,
    annotations,
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

function extractToolsListMessages(parsedBody: unknown): JsonRpcMessage[] {
  return normalizeMessages(parsedBody).filter((m) => m.method === "tools/list");
}

/** True si le corps POST ne contient que tools/list (+ notifications sans id). */
export function isStaticToolsListRequest(parsedBody: unknown): boolean {
  const messages = normalizeMessages(parsedBody);
  const toolsList = extractToolsListMessages(parsedBody);
  if (toolsList.length === 0) return false;

  const blockingRequests = messages.filter(
    (m) => m.method && m.id !== undefined && m.method !== "tools/list",
  );
  return blockingRequests.length === 0;
}

/** True si le corps ne contient que des notifications MCP (pas de requête JSON-RPC). */
export function isMcpNotificationOnlyRequest(parsedBody: unknown): boolean {
  const messages = normalizeMessages(parsedBody);
  if (messages.length === 0) return false;
  return messages.every(
    (m) => typeof m.method === "string" && m.method.startsWith("notifications/") && m.id === undefined,
  );
}

function formatSseEvent(message: object): string {
  return `event: message\ndata: ${JSON.stringify(message)}\n\n`;
}

function wantsEventStream(acceptHeader: string | null): boolean {
  return (acceptHeader ?? "").includes("text/event-stream");
}

/** Construit la réponse HTTP JSON-RPC pour tools/list (batch ou message unique). */
export function buildStaticToolsListHttpResponse(
  parsedBody: unknown,
  requestHeaders?: Headers,
): Response {
  const toolsListMessages = extractToolsListMessages(parsedBody);
  const payload = toolsListMessages.map((m) => ({
    jsonrpc: "2.0" as const,
    id: m.id ?? null,
    result: STATIC_TOOLS_LIST_RESULT,
  }));

  const accept = requestHeaders?.get("accept") ?? null;
  const sessionId = requestHeaders?.get("mcp-session-id");

  if (wantsEventStream(accept)) {
    const headers: Record<string, string> = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };
    if (sessionId) headers["mcp-session-id"] = sessionId;

    return new Response(payload.map(formatSseEvent).join(""), {
      status: 200,
      headers,
    });
  }

  const body = payload.length === 1 ? payload[0] : payload;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["mcp-session-id"] = sessionId;

  return new Response(JSON.stringify(body), { status: 200, headers });
}
