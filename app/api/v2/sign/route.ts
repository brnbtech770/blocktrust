import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/db";
import { authOptions } from "@/lib/auth";
import {
  generateJti,
  generateNonce,
  generateVerifyUrl,
  hashContent,
  signContent,
} from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { certificateId, content, ctxType = "message", metadata = {} } = body;

    if (!certificateId || !content) {
      return NextResponse.json(
        { error: "certificateId and content are required" },
        { status: 400 }
      );
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        id: certificateId,
        status: "ACTIVE",
        entity: {
          user: { email: session.user.email },
        },
      },
      include: { entity: true },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found or not active" },
        { status: 404 }
      );
    }

    const jti = generateJti();
    const nonce = generateNonce();
    const ctxHash = hashContent(content);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const signatureJwt = await signContent({
      jti,
      certificateId: certificate.id,
      entityId: certificate.entityId,
      ctxType,
      ctxHash,
      nonce,
    });

    const signature = await prisma.signature.create({
      data: {
        jti,
        certificateId: certificate.id,
        entityId: certificate.entityId,
        ctxType,
        ctxHash,
        ctxMetadata: metadata,
        signature: signatureJwt,
        nonce,
        expiresAt,
      },
    });

    const verifyUrl = generateVerifyUrl(jti, ctxHash);

    return NextResponse.json({
      success: true,
      data: {
        signatureId: signature.id,
        jti,
        verifyUrl,
        expiresAt: signature.expiresAt,
        entity: {
          name:
            certificate.entity.legalName ||
            `${certificate.entity.firstName} ${certificate.entity.lastName}`,
          type: certificate.entity.entityType,
        },
      },
    });
  } catch (error) {
    console.error("Sign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
