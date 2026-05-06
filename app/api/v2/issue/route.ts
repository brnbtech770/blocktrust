import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { canonicalizeEmailContext, sha256Hex } from "@/lib/v2/context";
import { signToken } from "@/lib/v2/jwt";
import crypto from "crypto";

const emailContextSchema = z.object({
  from: z.string().trim().min(1).max(500),
  to: z.string().trim().min(1).max(500),
  subject: z.string().trim().min(1).max(998),
  date: z.string().min(1).max(64),
  body: z.string().max(200_000).optional(),
});

const issueBodySchema = z.object({
  entityId: z.string().cuid(),
  certificateId: z.string().cuid(),
  context: emailContextSchema,
  expiresInSeconds: z.number().int().min(60).max(604800).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const parsed = issueBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { entityId, certificateId, context } = parsed.data;

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { entity: true },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (certificate.entity.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canonical = canonicalizeEmailContext(context);
    const ctxHash = sha256Hex(canonical);

    const jti = crypto.randomUUID();
    const expiresInSeconds = parsed.data.expiresInSeconds ?? 3600;

    const signature = await prisma.signature.create({
      data: {
        jti,
        certificateId,
        entityId,
        purpose: "email",
        contextHash: ctxHash,
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
    const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(token)}`;

    return NextResponse.json({ token, verifyUrl, signatureId: signature.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "issue_failed" }, { status: 500 });
  }
}
