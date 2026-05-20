// lib/extension-cors.ts
// CORS pour l’extension Chrome (chrome-extension://*, Gmail content script, app BLOCKTRUST).
// ============================================================

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const FALLBACK_ORIGIN = "https://blocktrust.tech";

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";

  const isAllowed =
    origin.startsWith("chrome-extension://") ||
    origin.includes("blocktrust.tech") ||
    origin.includes("mail.google.com") ||
    origin.includes("localhost");

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : FALLBACK_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
