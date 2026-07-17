// lib/credentials-login-check.ts
// Vérification credentials + lockout (pré-callback NextAuth et authorize)
// ============================================================

import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/db";
import { resolveEffectivePlan } from "@/lib/plan-features";
import {
  buildFailedErrorCode,
  checkLoginLockout,
  recordLoginFailure,
} from "@/lib/login-lockout";
import {
  ACCOUNT_SUSPENDED_MESSAGE,
  CREDENTIALS_ERROR_MESSAGE,
  NO_PASSWORD_ERROR_MESSAGE,
  failedAttemptsMessage,
  lockedMinutesMessage,
} from "@/lib/auth-signin-errors";

export type CredentialsLoginUser = {
  id: string;
  email: string | undefined;
  name: string | undefined;
  plan: string;
  kycStatus: string;
  accountType: string;
  cookieConsent: boolean;
};

export type CredentialsLoginCheckResult =
  | { ok: true; user: CredentialsLoginUser }
  | {
      ok: false;
      error: "locked";
      minutesRemaining: number;
      message: string;
      tone: "error";
    }
  | {
      ok: false;
      error: "invalid";
      attemptsRemaining: number;
      message: string;
      tone: "warning";
    }
  | {
      ok: false;
      error: "no_password";
      message: string;
      tone: "error";
    }
  | {
      ok: false;
      error: "account_suspended";
      message: string;
      tone: "error";
    };

async function findUserByEmailForCredentials(emailNorm: string) {
  const byExact = await prisma.user.findUnique({
    where: { email: emailNorm },
    include: { subscription: true, plan: { select: { type: true } } },
  });
  if (byExact) return byExact;

  return prisma.user.findFirst({
    where: { email: { equals: emailNorm, mode: "insensitive" } },
    include: { subscription: true, plan: { select: { type: true } } },
  });
}

function lockedResult(minutes: number): CredentialsLoginCheckResult {
  return {
    ok: false,
    error: "locked",
    minutesRemaining: minutes,
    message: lockedMinutesMessage(minutes),
    tone: "error",
  };
}

function failedResult(attemptsRemaining: number): CredentialsLoginCheckResult {
  return {
    ok: false,
    error: "invalid",
    attemptsRemaining,
    message: failedAttemptsMessage(attemptsRemaining),
    tone: "warning",
  };
}

/**
 * Vérifie lockout + identifiants sans créer de session.
 * En cas d'échec, incrémente le lockout. En cas de succès, ne touche pas au lockout
 * (recordLoginSuccess reste dans authorize après création de session).
 */
export async function checkCredentialsLogin(input: {
  email: string;
  password: string;
  clientIp?: string | null;
  /** Pré-check UI : n'incrémente pas le lockout pour emails inconnus (anti-DoS). */
  precheck?: boolean;
}): Promise<CredentialsLoginCheckResult> {
  const emailNorm = input.email.trim().toLowerCase();
  const password = input.password;
  const precheck = input.precheck ?? false;

  const lockout = await checkLoginLockout(emailNorm);
  if (lockout.locked) {
    return lockedResult(lockout.retryAfterMinutes);
  }

  const user = await findUserByEmailForCredentials(emailNorm);

  if (user?.accountStatus === "SUSPENDED") {
    return {
      ok: false,
      error: "account_suspended",
      message: ACCOUNT_SUSPENDED_MESSAGE,
      tone: "error",
    };
  }

  if (user && !user.password) {
    return {
      ok: false,
      error: "no_password",
      message: NO_PASSWORD_ERROR_MESSAGE,
      tone: "error",
    };
  }

  const recordFailure = async (userId?: string | null) => {
    const failStatus = await recordLoginFailure(emailNorm, {
      ip: input.clientIp,
      userId: userId ?? undefined,
    });
    if (failStatus.locked) {
      return lockedResult(failStatus.retryAfterMinutes);
    }
    return failedResult(failStatus.attemptsRemaining);
  };

  if (user?.email?.startsWith("deleted_")) {
    if (precheck) {
      return {
        ok: false,
        error: "invalid",
        attemptsRemaining: Math.max(1, lockout.attemptsRemaining - 1),
        message: CREDENTIALS_ERROR_MESSAGE,
        tone: "warning",
      };
    }
    return recordFailure(user.id);
  }

  if (!user) {
    if (precheck) {
      return {
        ok: false,
        error: "invalid",
        attemptsRemaining: Math.max(1, lockout.attemptsRemaining - 1),
        message: CREDENTIALS_ERROR_MESSAGE,
        tone: "warning",
      };
    }
    return recordFailure(null);
  }

  const passwordHash = user.password;
  if (!passwordHash) {
    return recordFailure(user.id);
  }

  const isValid = await bcrypt.compare(password, passwordHash);
  if (!isValid) {
    return recordFailure(user.id);
  }

  const plan = resolveEffectivePlan({
    subscription: user.subscription,
    email: user.email,
    planType: user.plan?.type,
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      plan,
      kycStatus: user.kycStatus ?? "PENDING",
      accountType: user.accountType ?? "PERSONAL",
      cookieConsent: user.cookieConsent ?? false,
    },
  };
}

/** Mappe le résultat check → codes CredentialsSignin throw (authorize). */
export function credentialsCheckToAuthErrorCode(
  result: Extract<CredentialsLoginCheckResult, { ok: false }>,
): string {
  if (result.error === "locked") {
    return `LOCKED:${result.minutesRemaining}`;
  }
  if (result.error === "invalid") {
    return buildFailedErrorCode(result.attemptsRemaining);
  }
  if (result.error === "account_suspended") {
    return "account_suspended";
  }
  if (result.error === "no_password") {
    return "no_password";
  }
  return "CredentialsSignin";
}

export function invalidCredentialsFallback(): Extract<
  CredentialsLoginCheckResult,
  { ok: false }
> {
  return {
    ok: false,
    error: "invalid",
    attemptsRemaining: 0,
    message: CREDENTIALS_ERROR_MESSAGE,
    tone: "warning",
  };
}
