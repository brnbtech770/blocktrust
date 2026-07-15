import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkCredentialsLogin,
  invalidCredentialsFallback,
} from "@/lib/credentials-login-check";
import { getAuthRatelimit, checkRateLimit } from "@/lib/rate-limit-verify";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const authRatelimit = getAuthRatelimit();
    const { limited } = await checkRateLimit(authRatelimit, ip);
    if (limited) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", message: "Trop de tentatives. Réessayez plus tard." },
        { status: 429 },
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const fallback = invalidCredentialsFallback();
      return NextResponse.json({
        ok: false,
        error: fallback.error,
        message: fallback.message,
        tone: fallback.tone,
      });
    }

    const emailNorm = parsed.data.email.trim().toLowerCase();
    const { limited: emailLimited } = await checkRateLimit(authRatelimit, emailNorm);
    if (emailLimited) {
      return NextResponse.json(
        { ok: false, error: "rate_limited", message: "Trop de tentatives. Réessayez plus tard." },
        { status: 429 },
      );
    }

    const result = await checkCredentialsLogin({
      email: emailNorm,
      password: parsed.data.password,
      clientIp: ip,
    });

    if (result.ok) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({
      ok: false,
      error: result.error,
      message: result.message,
      tone: result.tone,
      ...(result.error === "locked"
        ? { minutesRemaining: result.minutesRemaining }
        : {}),
      ...(result.error === "invalid"
        ? { attemptsRemaining: result.attemptsRemaining }
        : {}),
    });
  } catch (err) {
    console.error("[login-check]", err);
    return NextResponse.json(
      { ok: false, error: "server", message: "Erreur de connexion, réessayez." },
      { status: 500 },
    );
  }
}
