import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const certificate = await prisma.certificate.update({
      where: { id: certificateId },
      data: { status },
      include: {
        entity: true,
      },
    });

    if (status === "ACTIVE") {
      await prisma.entity.update({
        where: { id: certificate.entityId },
        data: { kycStatus: "VERIFIED" },
      });
    }

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        status: certificate.status,
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
            user: {
              select: {
                name: true,
                email: true,
              },
            },
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
