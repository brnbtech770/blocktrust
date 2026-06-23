// app/mcp/sse/route.ts
// Endpoint MCP Streamable HTTP (stateless — compatible Vercel serverless).
// Auth : Bearer bt_ext_… | Rate limit : 60/min
// Pas de session en mémoire : chaque POST est autonome (userId via clé API).
// ============================================================

import { NextRequest } from "next/server";
import {
  buildStaticToolsListHttpResponse,
  isMcpNotificationOnlyRequest,
  isStaticToolsListRequest,
} from "@/lib/mcp/static-tools-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function unauthorizedResponse(message: string): Response {
  return new Response(JSON.stringify({ error: "unauthorized", message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function rateLimitedResponse(retryAfter?: number): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Trop de requêtes MCP. Réessayez plus tard.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    },
  );
}

function methodNotAllowedResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    }),
    { status: 405, headers: { Allow: "POST", "Content-Type": "application/json" } },
  );
}

function rebuildRequest(req: NextRequest, body: unknown): Request {
  const headers = new Headers(req.headers);
  return new Request(req.url, {
    method: req.method,
    headers,
    body: JSON.stringify(body),
    duplex: "half",
  } as RequestInit);
}

/** Transport MCP stateless — une instance par requête POST (pas de session RAM). */
async function dispatchStatelessMcpPost(
  req: NextRequest,
  parsedBody: unknown,
  userId: string,
): Promise<Response> {
  const [{ WebStandardStreamableHTTPServerTransport }, { buildBlockTrustMcpServer }] =
    await Promise.all([
      import("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"),
      import("@/lib/mcp/server"),
    ]);

  const mcp = buildBlockTrustMcpServer(userId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // JSON complet par requête — indispensable serverless (pas de SSE stream coupé).
    enableJsonResponse: true,
  });

  await mcp.connect(transport);
  const forwardReq = rebuildRequest(req, parsedBody);
  const response = await transport.handleRequest(forwardReq, { parsedBody });
  void mcp.close().catch(() => null);
  void transport.close().catch(() => null);
  return response;
}

async function handleMcpPost(req: NextRequest, parsedBody: unknown): Promise<Response> {
  if (isStaticToolsListRequest(parsedBody)) {
    return buildStaticToolsListHttpResponse(parsedBody, req.headers);
  }

  if (isMcpNotificationOnlyRequest(parsedBody)) {
    return new Response(null, { status: 202 });
  }

  const [{ authenticateMcpRequest }, { checkMcpRateLimit }] = await Promise.all([
    import("@/lib/mcp/auth"),
    import("@/lib/mcp/rate-limit"),
  ]);

  const auth = await authenticateMcpRequest(req);
  if (!auth.ok) {
    return unauthorizedResponse(auth.message);
  }

  const rate = await checkMcpRateLimit(auth.keyHash);
  if (!rate.ok) {
    return rateLimitedResponse(rate.retryAfter);
  }

  return dispatchStatelessMcpPost(req, parsedBody, auth.userId);
}

export async function GET(): Promise<Response> {
  return methodNotAllowedResponse();
}

export async function POST(req: NextRequest): Promise<Response> {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return handleMcpPost(req, parsedBody);
}

export async function DELETE(): Promise<Response> {
  return new Response(null, { status: 200 });
}
