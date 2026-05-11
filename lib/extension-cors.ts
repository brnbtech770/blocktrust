// lib/extension-cors.ts
// CORS pour l’extension Chrome (toute origine chrome-extension://* + app BLOCKTRUST).
// ============================================================

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const isExtension = origin.startsWith("chrome-extension://");
  const isAllowed =
    isExtension ||
    origin.includes("blocktrust.tech") ||
    origin.includes("localhost");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export const extensionCorsHeaders = getCorsHeaders;

export function extensionJsonResponse(
  req: NextRequest,
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, { status, headers: getCorsHeaders(req) });
}
