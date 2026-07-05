// app/api/user/account/route.ts
// Suppression compte self-service (RGPD) — programmation 30 jours
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import {
  scheduleAccountDeletion,
  cancelScheduledAccountDeletion,
  userHasActivePaidSubscription,
  OrgOwnershipTransferRequiredError,
} from "@/lib/account-deletion";
import { writeSecurityAuditLogFireAndForget } from "@/lib/security-audit";

const deleteBodySchema = z
  .object({
    confirmation: z.literal("SUPPRIMER"),
  })
  .strict();

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = deleteBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Tapez SUPPRIMER pour confirmer la suppression." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, accountDeletionScheduledAt: true },
  });

  if (!user?.email || user.email.startsWith("deleted_")) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const hasActiveSub = await userHasActivePaidSubscription(user.id);
  if (hasActiveSub) {
    return NextResponse.json(
      {
        error:
          "Vous avez un abonnement actif. Annulez-le avant de supprimer votre compte.",
        billingUrl: "/dashboard/subscription",
      },
      { status: 409 },
    );
  }

  try {
    const scheduledAt = await scheduleAccountDeletion(user.id, user.email);

    return NextResponse.json({
      ok: true,
      scheduledAt: scheduledAt.toISOString(),
      message: "Votre compte sera supprimé dans 30 jours. Reconnectez-vous pour annuler.",
    });
  } catch (e) {
    if (e instanceof OrgOwnershipTransferRequiredError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 409 });
    }
    throw e;
  }
}

export async function PATCH(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await cancelScheduledAccountDeletion(session.user.id);

  writeSecurityAuditLogFireAndForget({
    action: "ACCOUNT_DELETION_CANCELLED",
    userId: session.user.id,
    resource: "user",
    resourceId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
