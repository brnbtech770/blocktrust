// app/api/user/password/route.ts
// POST — définir ou modifier le mot de passe (comptes credentials + Google-only)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { validatePassword } from "@/lib/password-policy";
import { invalidateUserSessions } from "@/lib/session-invalidation";

export const dynamic = "force-dynamic";

const newPasswordSchema = z.string().min(8, "Minimum 8 caractères");

const setPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

const changePasswordSchema = setPasswordSchema.extend({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
});

function clientIp(req: NextRequest): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const hasPassword = Boolean(user.password && user.password.length > 0);
  const ip = clientIp(req);

  if (hasPassword) {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Données invalides";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const currentValid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.password as string,
    );
    if (!currentValid) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
    }

    const policy = validatePassword(parsed.data.newPassword, user.email);
    if (!policy.valid) {
      return NextResponse.json({ error: policy.errors[0] }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    const sessionVersion = await invalidateUserSessions(user.id, {
      auditAction: "PASSWORD_CHANGED_SESSIONS_INVALIDATED",
      ip,
    });

    return NextResponse.json({
      success: true,
      mode: "changed" as const,
      sessionVersion,
    });
  }

  const parsed = setPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const policy = validatePassword(parsed.data.newPassword, user.email);
  if (!policy.valid) {
    return NextResponse.json({ error: policy.errors[0] }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ success: true, mode: "set" as const });
}
