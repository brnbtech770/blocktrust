/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { auth } from "@/app/lib/auth-server";
import { hashIp } from "@/app/lib/auth";
import { canonicalizeEmailContext, sha256Hex } from "@/lib/v2/context";
import { verifyToken } from "@/lib/v2/jwt";
import {
  createAdminFraudAlert,
  notifyCertificateOwnerFraudAlertFireAndForget,
} from "@/lib/verify-fraud";
import { persistUserTrustScore } from "@/lib/trustscore";
import { btLog } from "@/lib/prodLog";
import { checkPublicVerifyIpRateLimit, PUBLIC_RATE_LIMIT_503_BODY } from "@/lib/rate-limit-public-failclosed";
import { checkV2VerifyJti } from "@/lib/rate-limit-cost";

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
    // Endpoint PUBLIC : rate limit par IP en tête de route (anti-DoS + anti-pollution
    // du pipeline de détection de fraude). Fail-soft (Redis lazy + fallback in-memory).
    const ip = getIp(req);
    const ipRate = await checkPublicVerifyIpRateLimit(ip);
    if (!ipRate.ok && ipRate.kind === "unavailable") {
      return NextResponse.json(PUBLIC_RATE_LIMIT_503_BODY, { status: 503 });
    }
    if (!ipRate.ok) {
      return NextResponse.json(
        { verdict: "ERROR", reason: "rate_limited" },
        {
          status: 429,
          headers: ipRate.retryAfter
            ? { "Retry-After": String(ipRate.retryAfter) }
            : undefined,
        },
      );
    }

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

    // Anti-boucle : un même token (jti) ne peut pas être vérifié en rafale.
    const jtiRate = await checkV2VerifyJti(jti);
    if (!jtiRate.ok) {
      return NextResponse.json(
        { verdict: "ERROR", reason: "rate_limited" },
        {
          status: 429,
          headers: jtiRate.retryAfter
            ? { "Retry-After": String(jtiRate.retryAfter) }
            : undefined,
        },
      );
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
        include: { entity: true },
      });
      if (certWithOwner?.entity) {
        await createAdminFraudAlert({
          type: "FRAUD_ALERT",
          entityId: certWithOwner.entity.id,
          certificateId: certWithOwner.id,
          userId: certWithOwner.entity.userId,
          metadata: {
            reason: reason ?? "context_hash_mismatch",
            jti,
          },
        });
        void persistUserTrustScore(certWithOwner.entity.userId).catch((e) =>
          console.error("TrustScore update failed:", e)
        );
      }
      notifyCertificateOwnerFraudAlertFireAndForget({
        certificateId,
        alertType: "Contexte du message modifié (JWT)",
        detail: reason,
      });
      btLog(`[v2/verify] FRAUD_ALERT traité cert=${certificateId}`, "Fraud alert pipeline");
    }

    // Les IDs internes (entityId, certificateId, jti) ne doivent jamais fuiter à un
    // appelant ANONYME. On ne les renvoie qu'aux utilisateurs connectés ; un visiteur
    // public ne reçoit que le verdict + nom + date de certification.
    const session = await auth().catch(() => null);
    const authenticated = Boolean(session?.user?.id);

    return NextResponse.json({
      verdict,
      reason,
      ...(authenticated ? { entityId, certificateId, jti } : {}),
      ...(entityName ? { entityName } : {}),
      ...(certifiedAt ? { certifiedAt } : {}),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "verify_failed";
    return NextResponse.json({ verdict: "ERROR", reason: msg, error: msg }, { status: 500 });
  }
}
