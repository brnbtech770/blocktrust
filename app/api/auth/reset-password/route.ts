import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { createHash } from "node:crypto";
import { timingSafeEqualString } from "@/lib/api-key";
import bcrypt from "bcryptjs";

const passwordSchema = z
  .string()
  .min(12, "Minimum 12 caractères")
  .regex(/[A-Z]/, "Au moins 1 majuscule")
  .regex(/[0-9]/, "Au moins 1 chiffre")
  .regex(/[^a-zA-Z0-9]/, "Au moins 1 caractère spécial");

// M10 : valider le token reçu (32 octets → 64 hex). On compare ensuite par hash.
const tokenSchema = z.string().min(32);

const resetBodySchema = z.object({
  token: tokenSchema,
  password: z.string().min(1),
});

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const parsedToken = tokenSchema.safeParse(token);
  if (!parsedToken.success) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }
  const tokenHash = hashResetToken(parsedToken.data);
  const reset = await prisma.passwordReset.findFirst({
    where: { tokenHash, used: false },
  });
  if (!reset || !reset.tokenHash || !timingSafeEqualString(reset.tokenHash, tokenHash)) {
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

    const parsedBody = resetBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Lien invalide ou expiré." },
        { status: 400 }
      );
    }
    const { token, password } = parsedBody.data;

    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      const err = passwordValidation.error as { issues?: Array<{ message?: string }> };
      const msg = err.issues?.[0]?.message ?? "Mot de passe invalide.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Hash at rest : on hashe le token reçu et on compare au hash stocké (timing-safe).
    const tokenHash = hashResetToken(token);
    const reset = await prisma.passwordReset.findFirst({
      where: { tokenHash, used: false },
    });
    if (
      !reset ||
      !reset.tokenHash ||
      !timingSafeEqualString(reset.tokenHash, tokenHash) ||
      reset.expiresAt < new Date()
    ) {
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
