import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { accountType, name, email, password, company } = await request.json();

    if (!accountType || !["business", "individual"].includes(accountType)) {
      return NextResponse.json(
        { error: "Type de compte invalide" },
        { status: 400 }
      );
    }

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        company: company || null,
        accountType,
        status: "PENDING",
        plan: "TRIAL",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Inscription enregistrée. En attente de validation.",
    });
  } catch (error) {
    console.error("Erreur inscription:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
