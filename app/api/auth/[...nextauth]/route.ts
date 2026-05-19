// app/api/auth/[...nextauth]/route.ts
// Route NextAuth pour l'authentification
// ============================================================
//
// Les callbackUrl et redirections après connexion sont validés côté serveur dans
// app/lib/auth.ts (`callbacks.redirect`) via `isSafeCallbackUrl` (`app/lib/auth-callback-url.ts`).
//
// Magic link (`POST …/signin/email`) : rate limit strict IP + email (`lib/rate-limit-verify.ts`).

import { handlers } from "@/app/lib/auth-server";
import { authRatelimit, checkRateLimit } from "@/lib/rate-limit-verify";
import { NextRequest, NextResponse } from "next/server";

export const GET = handlers.GET;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** POST Auth.js vers le provider `email` (magic link). */
function isMagicLinkEmailPost(req: NextRequest): boolean {
  if (req.method !== "POST") return false;
  const parts = req.nextUrl.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  const signinIdx = parts.indexOf("signin");
  return signinIdx !== -1 && parts[signinIdx + 1] === "email";
}

async function readMagicLinkEmail(req: Request): Promise<string | null> {
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = await req.json();
      const email = body?.email;
      return typeof email === "string" ? email.trim().toLowerCase() : null;
    }
    if (ct.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(await req.text());
      const email = params.get("email");
      return email ? email.trim().toLowerCase() : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (isMagicLinkEmailPost(req)) {
    const ip = clientIp(req);

    const { limited } = await checkRateLimit(authRatelimit, ip);
    if (limited) {
      return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 });
    }

    const clone = req.clone();
    const email = await readMagicLinkEmail(clone);
    if (email) {
      const { limited: emailLimited } = await checkRateLimit(authRatelimit, email);
      if (emailLimited) {
        return NextResponse.json({ error: "Trop de tentatives" }, { status: 429 });
      }
    }
  }

  return handlers.POST(req);
}
