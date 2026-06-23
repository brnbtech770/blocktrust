// app/mcp/sse/route.ts
// Endpoint SSE MCP — GET (stream) + POST (JSON-RPC).
// Auth : Bearer bt_ext_… | Rate limit : 60/min
// tools/list : réponse statique immédiate (sans DB / Redis).
// ============================================================

import { NextRequest } from "next/server";
import { isInitializeRequest, JSONRPCMessageSchema } from "@modelcontextprotocol/sdk/types.js";
import { getMcpSessions, pruneStaleMcpSessions } from "@/lib/mcp/session-store";
import {
  buildStaticToolsListHttpResponse,
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

function rebuildRequest(req: NextRequest, body: unknown): Request {
  const headers = new Headers(req.headers);
  return new Request(req.url, {
    method: req.method,
    headers,
    body: JSON.stringify(body),
    duplex: "half",
  } as RequestInit);
}

async function createMcpSession(userId: string) {
  const [{ WebStandardStreamableHTTPServerTransport }, { buildBlockTrustMcpServer }] =
    await Promise.all([
      import("@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"),
      import("@/lib/mcp/server"),
    ]);

  pruneStaleMcpSessions();
  const mcp = buildBlockTrustMcpServer(userId);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (sessionId) => {
      getMcpSessions().set(sessionId, {
        transport,
        mcp,
        userId,
        createdAt: Date.now(),
      });
    },
    onsessionclosed: (sessionId) => {
      getMcpSessions().delete(sessionId);
      void mcp.close().catch(() => null);
    },
  });

  await mcp.connect(transport);
  return { transport, mcp, userId };
}

async function handleMcpRequest(
  req: NextRequest,
  preParsedBody?: unknown,
): Promise<Response> {
  if (
    req.method === "POST" &&
    preParsedBody !== undefined &&
    isStaticToolsListRequest(preParsedBody)
  ) {
    return buildStaticToolsListHttpResponse(preParsedBody, req.headers);
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

  const sessionId = req.headers.get("mcp-session-id");
  let parsedBody: unknown = preParsedBody;

  if (req.method === "POST" && parsedBody === undefined) {
    try {
      parsedBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (isStaticToolsListRequest(parsedBody)) {
      return buildStaticToolsListHttpResponse(parsedBody, req.headers);
    }
  }

  if (sessionId) {
    const session = getMcpSessions().get(sessionId);
    if (!session || session.userId !== auth.userId) {
      return new Response(JSON.stringify({ error: "session_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const forwardReq =
      req.method === "POST" && parsedBody !== undefined
        ? rebuildRequest(req, parsedBody)
        : req;
    return session.transport.handleRequest(forwardReq, { parsedBody });
  }

  if (req.method !== "POST" || parsedBody === undefined) {
    return new Response(
      JSON.stringify({
        error: "session_required",
        message: "Initialisez une session MCP via POST (initialize), puis réutilisez Mcp-Session-Id.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const messages = Array.isArray(parsedBody) ? parsedBody : [parsedBody];
  const isInit = messages.some((msg) => {
    try {
      return isInitializeRequest(JSONRPCMessageSchema.parse(msg));
    } catch {
      return false;
    }
  });

  if (!isInit) {
    return new Response(JSON.stringify({ error: "initialization_required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { transport } = await createMcpSession(auth.userId);
  const forwardReq = rebuildRequest(req, parsedBody);
  return transport.handleRequest(forwardReq, { parsedBody });
}

export async function GET(req: NextRequest): Promise<Response> {
  return handleMcpRequest(req);
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

  if (isStaticToolsListRequest(parsedBody)) {
    return buildStaticToolsListHttpResponse(parsedBody, req.headers);
  }

  return handleMcpRequest(req, parsedBody);
}

export async function DELETE(req: NextRequest): Promise<Response> {
  return handleMcpRequest(req);
}
