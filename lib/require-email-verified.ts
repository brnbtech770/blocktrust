// lib/require-email-verified.ts
// Garde-fous fonctionnalités nécessitant un email confirmé
// ============================================================

import { prisma } from "@/app/lib/db";
import {
  EMAIL_VERIFICATION_REQUIRED_SINCE,
  isGrandfatheredUser,
  requiresEmailVerification,
} from "@/lib/email-verification";
import { ACCOUNT_SUSPENDED_MESSAGE } from "@/lib/auth-signin-errors";

export const EMAIL_NOT_VERIFIED_MESSAGE =
  "Confirmez votre adresse email pour accéder à cette fonctionnalité.";

export type EmailVerificationGuardResult =
  | { ok: true }
  | { ok: false; status: 403; code: "EMAIL_NOT_VERIFIED" | "ACCOUNT_SUSPENDED"; message: string };

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
