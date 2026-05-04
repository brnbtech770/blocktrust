// GET /api/public/certificate/:id
// Infos publiques minimales (sans auth) pour la page /verify ?certId=
// Résolution alignée sur /verify/[id] : jti, certificateId, id/publicId du certificat.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { hashIp } from "@/app/lib/auth";
import { checkRateLimitVerifyAsync } from "@/lib/rate-limit-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tryJtiFromUnverifiedJwt(raw: string): string | null {
  const parts = raw.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1]) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { jti?: unknown };
    if (typeof payload.jti === "string" && payload.jti.length > 0) return payload.jti;
  } catch {
    /* pas un JWT */
  }
  return null;
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

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function resolveCertificateWithEntity(rawId: string) {
  const lookupKey = tryJtiFromUnverifiedJwt(rawId) ?? rawId;

  const byJti = await prisma.signature.findUnique({
    where: { jti: lookupKey },
    include: {
      certificate: { include: { entity: true } },
    },
  });
  if (byJti?.certificate) return byJti.certificate;

  const byCertIdSig = await prisma.signature.findFirst({
    where: { certificateId: lookupKey },
    orderBy: { issuedAt: "desc" },
    include: {
      certificate: { include: { entity: true } },
    },
  });
  if (byCertIdSig?.certificate) return byCertIdSig.certificate;

  return prisma.certificate.findFirst({
    where: { OR: [{ id: lookupKey }, { publicId: lookupKey }] },
    include: { entity: true },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawParam } = await params;
  const rawId = decodeURIComponent(rawParam ?? "").trim();
  if (!rawId) {
    return NextResponse.json({ verdict: "INVALID", reason: "missing_id" }, { status: 400 });
  }

  const ip = getIp(req);
  const rate = await checkRateLimitVerifyAsync(ip);
  if (!rate.ok) {
    return NextResponse.json(
      { verdict: "ERROR", reason: "rate_limited", error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 60) } }
    );
  }

  const ua = req.headers.get("user-agent") ?? "unknown";
  const certificate = await resolveCertificateWithEntity(rawId);

  /** Si la saisie correspond au préfixe exactement d’un seul certificat (typo / ID falsifié), alerte le titulaire. */
  async function tryRecordFraudAlertForSinglePrefixMatch(): Promise<boolean> {
    const prefix = rawId.trim();
    const PREFIX_MIN_LEN = 14;
    if (prefix.length < PREFIX_MIN_LEN) return false;

    const matches = await prisma.certificate.findMany({
      where: {
        OR: [{ id: { startsWith: prefix } }, { publicId: { startsWith: prefix } }],
      },
      select: { id: true },
      take: 16,
    });
    const uniqueIds = [...new Set(matches.map((m) => m.id))];
    if (uniqueIds.length !== 1) return false;

    await prisma.verification
      .create({
        data: {
          certificateId: uniqueIds[0],
          ipHash: hashIp(ip),
          userAgent: ua.slice(0, 500),
          referer: req.headers.get("referer"),
          result: "FRAUD_ALERT",
          metadata: {
            source: "public_certificate_api",
            reason: "bad_id_prefix_typo_or_fraud",
            attemptedLookup: prefix.slice(0, 120),
          },
        },
      })
      .catch(() => {});
    return true;
  }

  const auditNotFoundWithoutCertificate = () => {
    prisma.verification
      .create({
        data: {
          ipHash: hashIp(ip),
          userAgent: ua.slice(0, 500),
          referer: req.headers.get("referer"),
          result: "NOT_FOUND",
          metadata: {
            source: "public_certificate_api",
            lookupPrefix: rawId.slice(0, 64),
            verdict: "FRAUD",
            reason: "certificate_not_found",
          },
        },
      })
      .catch(() => {});
  };

  if (!certificate?.entity) {
    const fraudLinked = await tryRecordFraudAlertForSinglePrefixMatch();
    if (!fraudLinked) {
      auditNotFoundWithoutCertificate();
    }
    return NextResponse.json(
      { verdict: "FRAUD", reason: "certificate_not_found" },
      { status: 404 }
    );
  }

  const entity = certificate.entity;
  const entityName = entityDisplayName(entity);
  const certifiedAt = certificate.issuedAt.toISOString();
  const certificatePublicId = certificate.publicId ?? certificate.id;

  let verdict: "VALID" | "REVOKED" | "EXPIRED" | "INVALID" = "VALID";
  let verificationResult: "VALID" | "REVOKED" | "EXPIRED" | "NOT_FOUND" = "VALID";

  const status = certificate.status;

  if (status === "REVOKED") {
    verdict = "REVOKED";
    verificationResult = "REVOKED";
  } else if (status === "EXPIRED") {
    verdict = "EXPIRED";
    verificationResult = "EXPIRED";
  } else if (certificate.expiresAt && certificate.expiresAt.getTime() < Date.now()) {
    verdict = "EXPIRED";
    verificationResult = "EXPIRED";
  } else if (status !== "ACTIVE" && status !== "ANCHORED") {
    verdict = "INVALID";
    verificationResult = "NOT_FOUND";
  }

  prisma.verification
    .create({
      data: {
        certificateId: certificate.id,
        ipHash: hashIp(ip),
        userAgent: ua.slice(0, 500),
        referer: req.headers.get("referer"),
        result:
          verificationResult === "VALID"
            ? "VALID"
            : verificationResult === "REVOKED"
              ? "REVOKED"
              : verificationResult === "EXPIRED"
                ? "EXPIRED"
                : "NOT_FOUND",
        metadata: {
          source: "public_certificate_api",
          verdict,
          certificateStatus: status,
        },
      },
    })
    .catch(() => {});

  return NextResponse.json({
    verdict,
    entityName,
    certifiedAt,
    certificateId: certificatePublicId,
    certificateStatus: status,
  });
}
