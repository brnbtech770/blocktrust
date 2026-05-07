// lib/extension-cors.ts
// CORS pour l’extension Chrome (origins chrome-extension://*).
// ============================================================

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function extensionCorsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const allow =
    origin.startsWith("chrome-extension://") ||
    (appUrl !== "" && origin === appUrl) ||
    (process.env.NODE_ENV === "development" &&
      (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")));

  return {
    "Access-Control-Allow-Origin": allow ? origin : "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function extensionJsonResponse(
  req: NextRequest,
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(body, { status, headers: extensionCorsHeaders(req) });
}
