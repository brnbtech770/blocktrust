import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import bcrypt from "bcryptjs";

const passwordSchema = z
  .string()
  .min(12, "Minimum 12 caractères")
  .regex(/[A-Z]/, "Au moins 1 majuscule")
  .regex(/[0-9]/, "Au moins 1 chiffre")
  .regex(/[^a-zA-Z0-9]/, "Au moins 1 caractère spécial");

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }
  const reset = await prisma.passwordReset.findFirst({
    where: { token, used: false },
  });
  if (!reset) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }
  if (reset.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }
  return NextResponse.json({ valid: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = body as { token?: string; password?: string };

    const parsed = z.string().min(1).safeParse(password);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Mot de passe invalide." },
        { status: 400 }
      );
    }
    const passwordValidation = passwordSchema.safeParse(parsed.data);
    if (!passwordValidation.success) {
      const err = passwordValidation.error as { issues?: Array<{ message?: string }> };
      const msg = err.issues?.[0]?.message ?? "Mot de passe invalide.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Lien invalide ou expiré." },
        { status: 400 }
      );
    }

    const reset = await prisma.passwordReset.findFirst({
      where: { token, used: false },
    });
    if (!reset || reset.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Lien invalide ou expiré." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(passwordValidation.data, 12);

    const user = await prisma.user.findUnique({
      where: { email: reset.email },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Lien invalide ou expiré." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[RESET-PASSWORD]", err);
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}
