import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

// POST - Créer une nouvelle entité (B2B ou B2C)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType = "BUSINESS",
      legalName,
      siret,
      firstName,
      lastName,
      email,
      website,
      description,
    } = body;

    // Validation selon le type d'entité
    if (entityType === "BUSINESS") {
      if (!legalName || !siret || !email) {
        return NextResponse.json(
          { error: "Nom de l'entreprise, SIRET et email sont requis" },
          { status: 400 }
        );
      }
    } else if (entityType === "INDIVIDUAL") {
      if (!firstName || !lastName || !email) {
        return NextResponse.json(
          { error: "Prénom, nom et email sont requis" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Type d'entité invalide" },
        { status: 400 }
      );
    }

    // Créer ou récupérer l'utilisateur
    let user = await prisma.user.findFirst({
      where: { email: email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email,
          name: entityType === "BUSINESS" ? legalName : `${firstName} ${lastName}`,
        },
      });
    }

    // Créer l'entité selon le type
    const entity = await prisma.entity.create({
      data: {
        userId: user.id,
        entityType,
        // Champs B2B
        legalName: entityType === "BUSINESS" ? legalName : null,
        siret: entityType === "BUSINESS" ? siret : null,
        // Champs B2C
        firstName: entityType === "INDIVIDUAL" ? firstName : null,
        lastName: entityType === "INDIVIDUAL" ? lastName : null,
        // Champs communs
        email,
        website: website || null,
        description: description || null,
        kycStatus: "PENDING",
        validationLevel: "BRONZE",
      },
    });

    // Créer un certificat automatiquement
    const certificate = await prisma.certificate.create({
      data: {
        entityId: entity.id,
        status: "PENDING",
        level: "BRONZE",
      },
    });

    return NextResponse.json(
      {
        success: true,
        entity,
        certificate,
        message:
          entityType === "BUSINESS"
            ? "Entreprise créée avec succès !"
            : "Profil créé avec succès !",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erreur création entité:", error);

    // Gérer l'erreur de SIRET unique
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Ce SIRET est déjà enregistré" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET - Récupérer toutes les entités
export async function GET() {
  try {
    const entities = await prisma.entity.findMany({
      include: {
        certificates: true,
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(entities);
  } catch (error) {
    console.error("Erreur récupération entités:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
