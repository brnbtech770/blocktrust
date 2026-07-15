// lib/require-email-verified.ts
// Garde-fous fonctionnalités nécessitant un email confirmé
// ============================================================

import { prisma } from "@/app/lib/db";
import {
  isGrandfatheredUser,
  requiresEmailVerification,
} from "@/lib/email-verification";
import { ACCOUNT_SUSPENDED_MESSAGE } from "@/lib/auth-signin-errors";
import {
  assertNotDiscoveryExpired,
  type DiscoveryGuardResult,
} from "@/lib/require-discovery-active";

export const EMAIL_NOT_VERIFIED_MESSAGE =
  "Confirmez votre adresse email pour accéder à cette fonctionnalité.";

export type EmailVerificationGuardResult =
  | { ok: true }
  | { ok: false; status: 403; code: "EMAIL_NOT_VERIFIED" | "ACCOUNT_SUSPENDED"; message: string };

export type DashboardMutationGuardResult =
  | { ok: true }
  | Extract<EmailVerificationGuardResult, { ok: false }>
  | Extract<DiscoveryGuardResult, { ok: false }>;

export async function assertEmailVerifiedForFeature(
  userId: string,
): Promise<EmailVerificationGuardResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailVerified: true,
      createdAt: true,
      accountStatus: true,
    },
  });

  if (!user) {
    return {
      ok: false,
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      message: EMAIL_NOT_VERIFIED_MESSAGE,
    };
  }

  if (user.accountStatus === "SUSPENDED") {
    return {
      ok: false,
      status: 403,
      code: "ACCOUNT_SUSPENDED",
      message: ACCOUNT_SUSPENDED_MESSAGE,
    };
  }

  if (requiresEmailVerification(user)) {
    return {
      ok: false,
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      message: EMAIL_NOT_VERIFIED_MESSAGE,
    };
  }

  return { ok: true };
}

/** Email vérifié + plan Découverte non expiré (mutations dashboard). */
export async function assertDashboardMutationAllowed(
  userId: string,
  email?: string | null,
): Promise<DashboardMutationGuardResult> {
  const emailGuard = await assertEmailVerifiedForFeature(userId);
  if (!emailGuard.ok) return emailGuard;

  const discoveryGuard = await assertNotDiscoveryExpired(userId, email);
  if (!discoveryGuard.ok) return discoveryGuard;

  return { ok: true };
}
