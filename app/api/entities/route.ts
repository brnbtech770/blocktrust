import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

// POST - Créer une nouvelle entité
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { legalName, siret, email, website, description } = body;

    // Validation basique
    if (!legalName || !siret || !email) {
      return NextResponse.json(
        { error: "Nom légal, SIRET et email sont requis" },
        { status: 400 }
      );
    }

    // Créer un utilisateur temporaire (plus tard on utilisera l'auth)
    let user = await prisma.user.findFirst({
      where: { email: email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email,
          name: legalName,
        },
      });
    }

    // Créer l'entité
    const entity = await prisma.entity.create({
      data: {
        userId: user.id,
        legalName,
        siret,
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
        message: "Entité créée avec succès !" 
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

    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}