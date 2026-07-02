// app/api/user/onboarding-complete/route.ts
// Marque l'assistant onboarding dashboard comme terminé
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";

const bodySchema = z
  .object({
    completed: z.literal(true),
  })
  .strict();

export async function PATCH(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingCompletedAt: now },
  });

  return NextResponse.json({ ok: true, onboardingCompletedAt: now.toISOString() });
}
