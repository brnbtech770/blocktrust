import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateJti,
  generateNonce,
  hashContent,
  signContent,
} from "@/lib/crypto";

const ADMIN_EMAILS = ["brnbtech@gmail.com"];

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !ADMIN_EMAILS.includes(session.user.email.toLowerCase())
    ) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { certificateId, status } = await request.json();

    if (!certificateId || !["ACTIVE", "PENDING", "REVOKED"].includes(status)) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { entity: true },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificat non trouvé" },
        { status: 404 }
      );
    }

    const updatedCertificate = await prisma.certificate.update({
      where: { id: certificateId },
      data: { status },
    });

    if (status === "ACTIVE") {
      await prisma.entity.update({
        where: { id: certificate.entityId },
        data: { kycStatus: "VERIFIED" },
      });

      const existingSignature = await prisma.signature.findFirst({
        where: { certificateId: certificateId },
      });

      if (!existingSignature) {
        const jti = generateJti();
        const entity = certificate.entity;

        const contextPayload = {
          entityId: entity.id,
          entityType: entity.entityType,
          legalName: entity.legalName,
          firstName: entity.firstName,
          lastName: entity.lastName,
          email: entity.email,
          siret: entity.siret,
          certificateId: certificate.id,
          issuedAt: new Date().toISOString(),
        };

        const ctxHash = hashContent(JSON.stringify(contextPayload));
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const nonce = generateNonce();
        const signature = await signContent({
          jti,
          certificateId: certificate.id,
          entityId: entity.id,
          ctxType: "certificate",
          ctxHash,
          nonce,
        });

        await prisma.signature.create({
          data: {
            jti,
            certificateId: certificate.id,
            entityId: entity.id,
            ctxType: "certificate",
            ctxHash,
            ctxMetadata: JSON.parse(JSON.stringify(contextPayload)),
            signature,
            nonce,
            expiresAt,
            revoked: false,
          },
        });
      }
    }

    if (status === "REVOKED") {
      await prisma.signature.updateMany({
        where: { certificateId },
        data: { revoked: true },
      });
    }

    return NextResponse.json({
      success: true,
      certificate: {
        id: updatedCertificate.id,
        status: updatedCertificate.status,
      },
    });
  } catch (error) {
    console.error("Erreur mise à jour certificat:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.email ||
      !ADMIN_EMAILS.includes(session.user.email.toLowerCase())
    ) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const certificates = await prisma.certificate.findMany({
      include: {
        entity: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    return NextResponse.json({ certificates });
  } catch (error) {
    console.error("Erreur récupération certificats:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
