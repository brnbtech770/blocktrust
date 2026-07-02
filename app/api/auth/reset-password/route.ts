import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { createHash } from "node:crypto";
import { timingSafeEqualString } from "@/lib/api-key";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/password-policy";
import { invalidateUserSessions } from "@/lib/session-invalidation";
import { writeSecurityAuditLogFireAndForget } from "@/lib/security-audit";

const tokenSchema = z.string().min(32);

const resetBodySchema = z.object({
  token: tokenSchema,
  password: z.string().min(8).max(128),
});

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function clientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
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
        { status: 400 },
      );
    }
    const { token, password } = parsedBody.data;

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
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: reset.email },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Lien invalide ou expiré." },
        { status: 400 },
      );
    }

    const passwordValidation = validatePassword(password, user.email);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] ?? "Mot de passe invalide." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const ip = clientIp(req);

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

    await invalidateUserSessions(user.id, {
      auditAction: "PASSWORD_RESET_COMPLETED",
      ip,
    });

    writeSecurityAuditLogFireAndForget({
      action: "PASSWORD_CHANGED",
      userId: user.id,
      resource: "user",
      resourceId: user.id,
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[RESET-PASSWORD]", err);
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 },
    );
  }
}
