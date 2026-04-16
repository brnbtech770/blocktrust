import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createAdminAlert } from "@/lib/admin-alerts";

const registerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z
    .string()
    .min(12, "Minimum 12 caractères")
    .regex(/[A-Z]/, "Au moins 1 majuscule")
    .regex(/[0-9]/, "Au moins 1 chiffre")
    .regex(/[^a-zA-Z0-9]/, "Au moins 1 caractère spécial"),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      const err = parsed.error as { issues?: Array<{ message?: string }> };
      const message = err.issues?.[0]?.message ?? "Données invalides";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { firstName, lastName, email, password } = parsed.data;

    await new Promise((r) => setTimeout(r, Math.random() * 400 + 100));

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Une erreur est survenue. Vérifiez vos informations." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`.trim(),
        email,
        password: hashedPassword,
      },
    });

    await createAdminAlert({
      type: "NEW_USER",
      title: "Nouvel utilisateur inscrit",
      description: `${email} vient de créer un compte`,
      userId: user.id,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez." },
      { status: 500 }
    );
  }
}
