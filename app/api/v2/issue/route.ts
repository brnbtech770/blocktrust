import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { canonicalizeEmailContext, sha256Hex } from "@/lib/v2/context";
import { signToken } from "@/lib/v2/jwt";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Expected input (V2):
    // {
    //   entityId, certificateId,
    //   context: { from, to, subject, date, body? },
    //   expiresInSeconds?: number
    // }

    const entityId = String(body.entityId || "");
    const certificateId = String(body.certificateId || "");
    const context = body.context;

    if (!entityId || !certificateId || !context) {
      return NextResponse.json({ error: "Missing entityId/certificateId/context" }, { status: 400 });
    }

    const canonical = canonicalizeEmailContext(context);
    const ctxHash = sha256Hex(canonical);

    const jti = crypto.randomUUID();
    const expiresInSeconds = Number(body.expiresInSeconds || 3600);

    // Persist signature metadata
    const signature = await prisma.signature.create({
      data: {
        jti,
        certificateId,
        entityId,
        ctxType: "email",
        ctxHash,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      },
    });

    const token = await signToken(
      {
        jti,
        entityId,
        certificateId,
        ctx_type: "email",
        ctx_hash: ctxHash,
      },
      expiresInSeconds
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const ctxJson = JSON.stringify(context);
    const ctxB64 = Buffer.from(ctxJson, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(token)}&ctx=${encodeURIComponent(ctxB64)}`;

    return NextResponse.json({ token, verifyUrl, signatureId: signature.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "issue_failed" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
