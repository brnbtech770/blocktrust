// lib/mcp/types.ts
// Types MCP BlockTrust — JSON-RPC 2.0 et outils.
// ============================================================

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
};

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type McpToolContext = {
  userId: string;
  userEmail: string | null;
  plan: string;
};

export type McpAuthResult =
  | { ok: true; userId: string; keyHash: string }
  | { ok: false; status: number; message: string };

export type McpRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter?: number };

export type McpToolHandler = (
  ctx: McpToolContext,
  args: Record<string, unknown>,
) => Promise<CallToolResult>;
