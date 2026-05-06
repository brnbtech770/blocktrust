import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { hashIp } from "@/app/lib/auth";
import { canonicalizeEmailContext, sha256Hex } from "@/lib/v2/context";
import { verifyToken } from "@/lib/v2/jwt";
import { sendEmail } from "@/lib/email";
import { FraudAlertEmail, subject as fraudAlertSubject } from "@/emails/FraudAlertEmail";
import { btErrorDevDetails, btLog } from "@/lib/prodLog";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function entityDisplayName(entity: {
  entityType: string;
  legalName: string | null;
  tradeName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  if (entity.entityType === "INDIVIDUAL") {
    const name = [entity.firstName, entity.lastName].filter(Boolean).join(" ").trim();
    return name || entity.email;
  }
  return entity.legalName || entity.tradeName || entity.email;
}

const emailContextSchema = z.object({
  from: z.string().trim().min(1).max(500),
  to: z.string().trim().min(1).max(500),
  subject: z.string().trim().min(1).max(998),
  date: z.string().min(1).max(64),
  body: z.string().max(200_000).optional(),
});

const verifyBodySchema = z.object({
  token: z.string().min(1).max(24_000),
  context: emailContextSchema,
});

export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const bodyParsed = verifyBodySchema.safeParse(json);
    if (!bodyParsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { token, context } = bodyParsed.data;

    const payload = await verifyToken(token);

    const jti = String(payload.jti || "");
    const entityId = String(payload.entityId || "");
    const certificateId = String(payload.certificateId || "");
    const expectedHash = String(payload.ctx_hash || "");

    if (!jti || !expectedHash) {
      return NextResponse.json({ verdict: "INVALID", reason: "token_missing_claims" }, { status: 400 });
    }

    const canonical = canonicalizeEmailContext(context);
    const computedHash = sha256Hex(canonical);

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

    if (computedHash !== expectedHash || computedHash !== sig.contextHash) {
      verdict = "TAMPERED";
      reason = "context_hash_mismatch";
    }

    const ip = getIp(req);
    const ua = req.headers.get("user-agent") || "unknown";
    const ipHash = hashIp(ip);

    await prisma.verification.create({
      data: {
        certificateId: sig.certificateId,
        ipHash,
        userAgent: ua.slice(0, 500),
        result:
          verdict === "VALID" || verdict === "VALID_WITH_WARNING" ? "VALID" : "FRAUD_ALERT",
        signatureJti: jti,
      },
    });

    let entityName: string | undefined;
    let certifiedAt: string | undefined;

    if (verdict === "VALID") {
      const cert = await prisma.certificate.findUnique({
        where: { id: sig.certificateId },
        include: { entity: true },
      });
      if (cert?.entity) {
        entityName = entityDisplayName(cert.entity);
        certifiedAt = cert.issuedAt.toISOString();
      }
    }

    if (verdict === "TAMPERED") {
      const certWithOwner = await prisma.certificate.findUnique({
        where: { id: certificateId },
        include: {
          entity: {
            include: {
              user: { select: { email: true } },
            },
          },
        },
      });
      const ownerEmail = certWithOwner?.entity?.user?.email;
      if (ownerEmail && certWithOwner?.entity) {
        const fraudEntityName =
          certWithOwner.entity.entityType === "INDIVIDUAL"
            ? `${certWithOwner.entity.firstName || ""} ${certWithOwner.entity.lastName || ""}`.trim() ||
              certWithOwner.entity.email
            : certWithOwner.entity.legalName || certWithOwner.entity.email;
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://blocktrust.tech";
        await sendEmail({
          to: ownerEmail,
          subject: fraudAlertSubject,
          react: FraudAlertEmail({
            entityName: fraudEntityName,
            tokenId: jti,
            timestamp: new Date().toISOString(),
            ip: ip !== "unknown" ? ip : undefined,
            revokeUrl: `${baseUrl}/dashboard/certificate/${certificateId}`,
          }),
        }).then(({ error }) => {
          if (error) {
            btErrorDevDetails(
              { context: "Fraud alert email", to: ownerEmail, error },
              "Fraud alert email failed"
            );
          } else {
            btLog(`[Verify] Fraud alert email envoyé à: ${ownerEmail}`, "Fraud alert email sent");
          }
        });
      }
    }

    return NextResponse.json({
      verdict,
      reason,
      entityId,
      certificateId,
      jti,
      ...(entityName ? { entityName } : {}),
      ...(certifiedAt ? { certifiedAt } : {}),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "verify_failed";
    return NextResponse.json({ verdict: "ERROR", reason: msg, error: msg }, { status: 500 });
  }
}
