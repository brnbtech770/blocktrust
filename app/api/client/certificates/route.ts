import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, status: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Compte non activé" }, { status: 403 });
    }

    const body = await request.json();
    const {
      entityType,
      legalName,
      siret,
      firstName,
      lastName,
      email,
      website,
      description,
    } = body;

    if (!entityType || !["BUSINESS", "INDIVIDUAL"].includes(entityType)) {
      return NextResponse.json(
        { error: "Type d'entité invalide" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    if (entityType === "BUSINESS") {
      if (!legalName) {
        return NextResponse.json(
          { error: "Raison sociale requise" },
          { status: 400 }
        );
      }
      if (!siret || !/^[0-9]{14}$/.test(siret)) {
        return NextResponse.json(
          { error: "SIRET invalide (14 chiffres)" },
          { status: 400 }
        );
      }

      const existingSiret = await prisma.entity.findUnique({
        where: { siret },
      });
      if (existingSiret) {
        return NextResponse.json(
          { error: "Ce SIRET est déjà enregistré" },
          { status: 400 }
        );
      }
    }

    if (entityType === "INDIVIDUAL") {
      if (!firstName || !lastName) {
        return NextResponse.json(
          { error: "Prénom et nom requis" },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const entity = await tx.entity.create({
        data: {
          userId: user.id,
          entityType,
          legalName: entityType === "BUSINESS" ? legalName : null,
          siret: entityType === "BUSINESS" ? siret : null,
          firstName: entityType === "INDIVIDUAL" ? firstName : null,
          lastName: entityType === "INDIVIDUAL" ? lastName : null,
          email,
          website: website || null,
          description: description || null,
          kycStatus: "PENDING",
          validationLevel: "BRONZE",
        },
      });

      const certificate = await tx.certificate.create({
        data: {
          entityId: entity.id,
          status: "PENDING",
          level: "BRONZE",
        },
      });

      return { entity, certificate };
    });

    return NextResponse.json({
      success: true,
      entityId: result.entity.id,
      certificateId: result.certificate.id,
    });
  } catch (error) {
    console.error("Erreur création certificat:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
