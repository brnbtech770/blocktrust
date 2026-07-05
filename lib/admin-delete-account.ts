// lib/admin-delete-account.ts
// Suppression immédiate de compte par un admin dashboard (anonymisation RGPD)
// ============================================================

import { prisma } from "@/app/lib/db";
import {
  isDashboardAdmin,
  isSuperAdmin,
} from "@/lib/admin-utils";
import {
  cancelStripeSubscriptionIfActive,
  userHasActivePaidSubscription,
} from "@/lib/account-deletion";
import { anonymizeUserDataCascade } from "@/lib/user-deletion-cascade";
import { hashAuditEmail, writeSecurityAuditLog } from "@/lib/security-audit";

export type AdminDeleteAccountResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      requiresStripeCancellation?: boolean;
    };

export type AdminDeleteAccountParams = {
  targetUserId: string;
  adminUserId: string;
  adminEmail: string;
  reason: string;
  confirmEmail: string;
  cancelStripe?: boolean;
};

export async function deleteAccountAsAdmin(
  params: AdminDeleteAccountParams,
): Promise<AdminDeleteAccountResult> {
  const {
    targetUserId,
    adminUserId,
    adminEmail,
    reason,
    confirmEmail,
    cancelStripe = false,
  } = params;

  if (!isDashboardAdmin(adminEmail)) {
    return { ok: false, status: 403, error: "Accès refusé." };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true },
  });

  if (!target?.email || target.email.startsWith("deleted_")) {
    return { ok: false, status: 404, error: "Utilisateur introuvable." };
  }

  if (target.email.toLowerCase() === adminEmail.toLowerCase()) {
    return {
      ok: false,
      status: 400,
      error: "Vous ne pouvez pas supprimer votre propre compte depuis l'admin.",
    };
  }

  if (
    confirmEmail.trim().toLowerCase() !== target.email.trim().toLowerCase()
  ) {
    return {
      ok: false,
      status: 400,
      error: "L'email de confirmation ne correspond pas au compte cible.",
    };
  }

  if (isDashboardAdmin(target.email) && !isSuperAdmin(adminEmail)) {
    return {
      ok: false,
      status: 403,
      error:
        "Seul le super administrateur peut supprimer un compte administrateur.",
      code: "ADMIN_PROTECTED",
    };
  }

  const hasActiveSub = await userHasActivePaidSubscription(targetUserId);
  if (hasActiveSub && !cancelStripe) {
    return {
      ok: false,
      status: 409,
      error:
        "Ce compte a un abonnement Stripe actif. Cochez « Annuler l'abonnement Stripe » pour confirmer.",
      code: "ACTIVE_SUBSCRIPTION",
      requiresStripeCancellation: true,
    };
  }

  if (hasActiveSub && cancelStripe) {
    await cancelStripeSubscriptionIfActive(targetUserId);
  }

  await writeSecurityAuditLog({
    action: "ADMIN_ACCOUNT_DELETED",
    userId: adminUserId,
    resource: "user",
    resourceId: targetUserId,
    metadata: {
      targetUserId,
      adminId: adminUserId,
      targetEmailHash: hashAuditEmail(target.email),
      reason: reason.trim(),
    },
  });

  await prisma.$transaction((tx) => anonymizeUserDataCascade(targetUserId, tx));

  return { ok: true };
}
