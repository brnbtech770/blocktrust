import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { timingSafeEqual } from "crypto";
import { rateLimit } from "@/app/lib/rate-limit";
import { verifyQuerySchema } from "@/app/lib/validations";

const MIN_HASH_LENGTH = 16;

const verifyRateLimiter = rateLimit({ interval: 60_000, maxRequests: 60 });

function secureHashCompare(hashFromUrl: string, hashStored: string): boolean {
  const compareTarget = hashStored.substring(0, hashFromUrl.length);

  try {
    const hashBuffer = Buffer.from(hashFromUrl, "utf8");
    const storedBuffer = Buffer.from(compareTarget, "utf8");

    if (hashBuffer.length !== storedBuffer.length) {
      return false;
    }

    return timingSafeEqual(hashBuffer, storedBuffer);
  } catch {
    return false;
  }
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

// GET - Vérifier un certificat V2
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jti = searchParams.get("jti");
    const hash = searchParams.get("h");

    const ip = getClientIp(request);
    const rate = verifyRateLimiter.check(`verify:${ip}`);
    if (!rate.success) {
      return NextResponse.json(
        {
          valid: false,
          verdict: "RATE_LIMITED",
          message: "⏳ Trop de requêtes. Réessaie plus tard.",
        },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Validation Zod
    const parseResult = verifyQuerySchema.safeParse({
      jti,
      h: hash,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          valid: false,
          verdict: "INVALID_INPUT",
          message: "❌ Paramètres invalides.",
          errors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Récupère la signature
    const signature = await prisma.signature.findUnique({
      where: { jti },
    });

    if (!signature) {
      // Log l'événement de vérification échouée
      await prisma.verificationEvent.create({
        data: {
          jti: jti || "unknown",
          ip,
          userAgent: request.headers.get("user-agent") || "unknown",
          verdict: "INVALID_TOKEN",
        },
      });

      return NextResponse.json(
        {
          valid: false,
          verdict: "INVALID_TOKEN",
          message: "❌ Ce certificat n'existe pas ou a été falsifié.",
        },
        { status: 404 }
      );
    }

    // Vérifie si révoqué
    if (signature.revoked) {
      await prisma.verificationEvent.create({
        data: {
          jti,
          ip,
          userAgent: request.headers.get("user-agent") || "unknown",
          verdict: "REVOKED",
        },
      });

      return NextResponse.json({
        valid: false,
        verdict: "REVOKED",
        message: "❌ Ce certificat a été révoqué.",
      });
    }

    // Vérifie si expiré
    if (new Date() > signature.expiresAt) {
      await prisma.verificationEvent.create({
        data: {
          jti,
          ip,
          userAgent: request.headers.get("user-agent") || "unknown",
          verdict: "EXPIRED",
        },
      });

      return NextResponse.json({
        valid: false,
        verdict: "EXPIRED",
        message: "❌ Ce certificat a expiré.",
      });
    }

    // Hash requis pour l'anti-falsification
    if (!hash) {
      await prisma.verificationEvent.create({
        data: {
          jti,
          ip,
          userAgent: request.headers.get("user-agent") || "unknown",
          verdict: "HASH_MISSING",
        },
      });

      return NextResponse.json({
        valid: false,
        verdict: "HASH_MISSING",
        message: "⚠️ Lien incomplet : hash manquant.",
      });
    }

    if (hash.length < MIN_HASH_LENGTH) {
      await prisma.verificationEvent.create({
        data: {
          jti,
          ip,
          userAgent: request.headers.get("user-agent") || "unknown",
          verdict: "HASH_TOO_SHORT",
        },
      });

      return NextResponse.json({
        valid: false,
        verdict: "HASH_TOO_SHORT",
        message: "⚠️ Hash invalide : longueur insuffisante.",
      });
    }

    // Vérifie le hash du contenu (anti-falsification !)
    if (!secureHashCompare(hash, signature.ctxHash)) {
      await prisma.verificationEvent.create({
        data: {
          jti,
          ip,
          userAgent: request.headers.get("user-agent") || "unknown",
          verdict: "HASH_MISMATCH",
        },
      });

      return NextResponse.json({
        valid: false,
        verdict: "HASH_MISMATCH",
        message: "⚠️ ALERTE FRAUDE : Ce lien a été copié dans un contexte différent !",
      });
    }

    // Récupère l'entité
    const entity = await prisma.entity.findUnique({
      where: { id: signature.entityId },
    });

    if (!entity) {
      return NextResponse.json(
        {
          valid: false,
          verdict: "ENTITY_NOT_FOUND",
          message: "❌ Entité non trouvée.",
        },
        { status: 404 }
      );
    }

    // Log l'événement de vérification réussie
    await prisma.verificationEvent.create({
      data: {
        jti,
        ip,
        userAgent: request.headers.get("user-agent") || "unknown",
        verdict: "VALID",
      },
    });

    // Succès !
    return NextResponse.json({
      valid: true,
      verdict: "VALID",
      message: "✅ Certificat valide et authentique !",
      data: {
        entity: {
          id: entity.id,
          type: entity.entityType,
          name:
            entity.entityType === "BUSINESS"
              ? entity.legalName
              : `${entity.firstName} ${entity.lastName}`,
          email: entity.email,
          validationLevel: entity.validationLevel,
          kycStatus: entity.kycStatus,
        },
        certificate: {
          contextType: signature.ctxType,
          issuedAt: signature.issuedAt,
          expiresAt: signature.expiresAt,
        },
      },
    });
  } catch (error: any) {
    console.error("Erreur vérification V2:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
