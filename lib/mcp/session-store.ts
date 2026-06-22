// lib/mcp/session-store.ts
// Sessions MCP en mémoire (même instance serverless).
// ============================================================

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export type McpSession = {
  transport: WebStandardStreamableHTTPServerTransport;
  mcp: McpServer;
  userId: string;
  createdAt: number;
};

type GlobalMcp = typeof globalThis & {
  __blocktrustMcpSessions?: Map<string, McpSession>;
};

export function getMcpSessions(): Map<string, McpSession> {
  const g = globalThis as GlobalMcp;
  if (!g.__blocktrustMcpSessions) {
    g.__blocktrustMcpSessions = new Map();
  }
  return g.__blocktrustMcpSessions;
}

const SESSION_TTL_MS = 30 * 60 * 1000;

export function pruneStaleMcpSessions(): void {
  const now = Date.now();
  for (const [id, session] of getMcpSessions()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      void session.mcp.close().catch(() => null);
      getMcpSessions().delete(id);
    }
  }
}
