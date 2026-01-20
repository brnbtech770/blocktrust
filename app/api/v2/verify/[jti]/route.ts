import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { hashIP, verifySignature } from "@/lib/crypto";

type Verdict =
  | "VALID"
  | "FRAUD_ALERT"
  | "EXPIRED"
  | "REVOKED"
  | "NOT_FOUND"
  | "ERROR";

interface VerifyResult {
  verdict: Verdict;
  fraudReason?: string;
  entity?: {
    name: string;
    type: string;
    validationLevel: string;
  };
  signature?: {
    issuedAt: Date;
    expiresAt: Date;
    ctxType: string;
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jti: string }> }
) {
  const { jti } = await context.params;
  const hashFromUrl = req.nextUrl.searchParams.get("h");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const country = req.headers.get("x-vercel-ip-country") || null;

  let result: VerifyResult;
  let fraudReason: string | undefined;

  try {
    const signature = await prisma.signature.findUnique({
      where: { jti },
      include: {
        certificate: true,
        entity: true,
      },
    });

    if (!signature) {
      result = { verdict: "NOT_FOUND" };
    } else if (signature.revoked) {
      result = { verdict: "REVOKED" };
    } else if (new Date() > signature.expiresAt) {
      result = { verdict: "EXPIRED" };
    } else if (!hashFromUrl) {
      result = { verdict: "FRAUD_ALERT" };
      fraudReason = "MISSING_HASH";
    } else if (!signature.ctxHash.startsWith(hashFromUrl)) {
      result = { verdict: "FRAUD_ALERT" };
      fraudReason = "HASH_MISMATCH";
    } else {
      const jwtPayload = await verifySignature(signature.signature);
      if (!jwtPayload) {
        result = { verdict: "FRAUD_ALERT" };
        fraudReason = "INVALID_SIGNATURE";
      } else {
        result = {
          verdict: "VALID",
          entity: {
            name:
              signature.entity.legalName ||
              `${signature.entity.firstName} ${signature.entity.lastName}`,
            type: signature.entity.entityType,
            validationLevel: signature.entity.validationLevel,
          },
          signature: {
            issuedAt: signature.issuedAt,
            expiresAt: signature.expiresAt,
            ctxType: signature.ctxType,
          },
        };
      }
    }

    if (signature) {
      await prisma.verificationEventV2.create({
        data: {
          signatureId: signature.id,
          hashFromUrl: hashFromUrl || "MISSING",
          ipHash: hashIP(ip),
          userAgent: userAgent.substring(0, 255),
          country,
          verdict: result.verdict,
          fraudReason,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { verdict: "ERROR", error: "Internal server error" },
      { status: 500 }
    );
  }
}
