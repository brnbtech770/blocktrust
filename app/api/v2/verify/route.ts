import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { canonicalizeEmailContext, sha256Hex } from "@/lib/v2/context";
import { verifyToken } from "@/lib/v2/jwt";
import { sendEmail } from "@/lib/email";
import { FraudAlertEmail, subject as fraudAlertSubject } from "@/emails/FraudAlertEmail";

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

    if (computedHash !== expectedHash || computedHash !== sig.contextHash) {
      verdict = "TAMPERED";
      reason = "context_hash_mismatch";
    }

    // Minimal anti-replay: if verified multiple times from different UA/IP -> warning
    const ip = getIp(req);
    const ua = req.headers.get("user-agent") || "unknown";

    // Note: Le modèle Verification n'a pas de champ jti direct, on utilise signatureJti
    // Pour l'instant, on crée une vérification basique
    await prisma.verification.create({
      data: {
        certificateId: sig.certificateId,
        ipHash: ip, // TODO: Hasher l'IP avec hashIp() pour RGPD
        userAgent: ua,
        result: verdict === "VALID" || verdict === "VALID_WITH_WARNING" ? "VALID" : "FRAUD_ALERT",
        signatureJti: jti,
      },
    });

    // Alerte fraude : envoyer email au propriétaire du certificat
    if (verdict === "TAMPERED" || verdict === "FRAUD_ALERT") {
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
      if (ownerEmail) {
        const entityName =
          certWithOwner!.entity.entityType === "INDIVIDUAL"
            ? `${certWithOwner!.entity.firstName || ""} ${certWithOwner!.entity.lastName || ""}`.trim() ||
              certWithOwner!.entity.email
            : certWithOwner!.entity.legalName || certWithOwner!.entity.email;
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://blocktrust.tech";
        await sendEmail({
          to: ownerEmail,
          subject: fraudAlertSubject,
          react: FraudAlertEmail({
            entityName,
            tokenId: jti,
            timestamp: new Date().toISOString(),
            ip: ip !== "unknown" ? ip : undefined,
            revokeUrl: `${baseUrl}/dashboard/certificate/${certificateId}`,
          }),
        }).then(({ error }) => {
          if (error) console.error('[Verify] Fraud alert email échoué:', { to: ownerEmail, error })
          else console.log('[Verify] Fraud alert email envoyé à:', ownerEmail)
        });
      }
    }

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
