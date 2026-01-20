import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import * as crypto from "crypto";
import { rateLimit } from "@/app/lib/rate-limit";
import { issueSignatureSchema } from "@/app/lib/validations";
import { generateNonce, signContent } from "@/lib/crypto";

const issueRateLimiter = rateLimit({ interval: 60_000, maxRequests: 10 });

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

// POST - Émettre un certificat signé V2
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = issueRateLimiter.check(`issue:${ip}`);
    if (!rate.success) {
      return NextResponse.json(
        {
          error: "Trop de requêtes. Réessaie plus tard.",
        },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Parse et validation Zod
    const body = await request.json();
    const parseResult = issueSignatureSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { entityId, contextType, contextData, expiresInDays } = parseResult.data;
    const ctxType = contextType;

    void expiresInDays;

    // Vérifie que l'entité existe
    const entity = await prisma.entity.findUnique({
      where: { id: entityId },
      include: { certificates: true },
    });

    if (!entity) {
      return NextResponse.json({ error: "Entité non trouvée" }, { status: 404 });
    }

    // Récupère ou crée le certificat
    let certificate = entity.certificates[0];
    if (!certificate) {
      certificate = await prisma.certificate.create({
        data: {
          entityId: entity.id,
          status: "ACTIVE",
          level: entity.validationLevel,
        },
      });
    }

    // Génère le hash du contenu (SHA-256)
    const contentToHash = JSON.stringify({
      entityId,
      contextType,
      contextData,
      timestamp: new Date().toISOString(),
    });
    const ctxHash = crypto.createHash("sha256").update(contentToHash).digest("hex");

    // Génère un JTI unique (JWT ID)
    const jti = crypto.randomUUID();

    // Date d'expiration (1 an)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Génère un nonce anti-replay
    const nonce = generateNonce();

    // Génère le JWT signé
    const jwtSignature = await signContent({
      jti,
      certificateId: certificate.id,
      entityId: entity.id,
      ctxType,
      ctxHash,
      nonce,
    });

    // Crée la signature en base
    const signature = await prisma.signature.create({
      data: {
        jti,
        certificateId: certificate.id,
        entityId: entity.id,
        ctxType,
        ctxHash,
        ctxMetadata: contextData ?? undefined,
        signature: jwtSignature,
        nonce,
        expiresAt,
        revoked: false,
      },
    });

    // URL de vérification V2
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://blocktrust.tech"}/v/${jti}?h=${ctxHash.substring(0, 16)}`;

    return NextResponse.json(
      {
        success: true,
        data: {
          jti,
          token: jwtSignature,
          ctxHash,
          verifyUrl,
          expiresAt: expiresAt.toISOString(),
          entity: {
            id: entity.id,
            type: entity.entityType,
            name:
              entity.entityType === "BUSINESS"
                ? entity.legalName
                : `${entity.firstName} ${entity.lastName}`,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erreur émission V2:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
