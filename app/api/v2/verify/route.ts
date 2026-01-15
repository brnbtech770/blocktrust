import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { canonicalizeEmailContext, sha256Hex } from "@/lib/v2/context";
import { verifyToken } from "@/lib/v2/jwt";

const prisma = new PrismaClient();

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Expected input:
    // { token, context: { from,to,subject,date,body? } }
    const token = String(body.token || "");
    const context = body.context;

    if (!token || !context) {
      return NextResponse.json({ error: "Missing token/context" }, { status: 400 });
    }

    const payload = await verifyToken(token);

    const jti = String(payload.jti || "");
    const entityId = String(payload.entityId || "");
    const certificateId = String(payload.certificateId || "");
    const expectedHash = String(payload.ctx_hash || "");

    if (!jti || !expectedHash) {
      return NextResponse.json({ verdict: "INVALID", reason: "token_missing_claims" }, { status: 400 });
    }

    // Compute ctx hash from provided context
    const canonical = canonicalizeEmailContext(context);
    const computedHash = sha256Hex(canonical);

    // Fetch signature record
    const sig = await prisma.signature.findUnique({ where: { jti } });
    if (!sig) {
      return NextResponse.json({ verdict: "INVALID", reason: "unknown_jti" }, { status: 404 });
    }
    if (sig.revoked) {
      return NextResponse.json({ verdict: "REVOKED" }, { status: 200 });
    }
    if (sig.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ verdict: "EXPIRED" }, { status: 200 });
    }

    let verdict = "VALID";
    let reason: string | null = null;

    if (computedHash !== expectedHash || computedHash !== sig.ctxHash) {
      verdict = "TAMPERED";
      reason = "context_hash_mismatch";
    }

    // Minimal anti-replay: if verified multiple times from different UA/IP -> warning
    const ip = getIp(req);
    const ua = req.headers.get("user-agent") || "unknown";

    const previous = await prisma.verificationEvent.findFirst({
      where: { jti },
      orderBy: { createdAt: "desc" },
    });

    if (previous && verdict === "VALID") {
      const changed = (previous.ip && previous.ip !== ip) || (previous.userAgent && previous.userAgent !== ua);
      if (changed) {
        verdict = "VALID_WITH_WARNING";
        reason = "possible_replay";
      }
    }

    await prisma.verificationEvent.create({
      data: {
        jti,
        ip,
        userAgent: ua,
        verdict,
      },
    });

    return NextResponse.json({
      verdict,
      reason,
      entityId,
      certificateId,
      jti,
    });
  } catch (e: any) {
    return NextResponse.json({ verdict: "ERROR", error: e?.message || "verify_failed" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
