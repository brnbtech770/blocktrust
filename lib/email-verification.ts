// lib/email-verification.ts
// Vérification email à l'inscription (token 24h, rappels, suspension)
// ============================================================

import crypto from "node:crypto";
import * as React from "react";
import { prisma } from "@/app/lib/db";
import { sendEmail, sendEmailFireAndForget } from "@/lib/email";
import { resolveWelcomeFirstName } from "@/lib/welcome-email";
import {
  getResendVerificationLimiter,
  tryRedisLimit,
} from "@/lib/rate-limit-redis";

/** Comptes créés avant cette date : pas de blocage (grandfathering). */
export const EMAIL_VERIFICATION_REQUIRED_SINCE = new Date("2026-07-13T00:00:00.000Z");

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
const REMINDER_72H_MS = 72 * 60 * 60 * 1000;
const SUSPEND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type EmailVerificationUserSlice = {
  emailVerified: Date | null;
  createdAt: Date;
  accountStatus: "ACTIVE" | "SUSPENDED";
};

export function isGrandfatheredUser(user: {
  createdAt: Date;
  emailVerified: Date | null;
}): boolean {
  return user.createdAt < EMAIL_VERIFICATION_REQUIRED_SINCE;
}

export function requiresEmailVerification(user: EmailVerificationUserSlice): boolean {
  if (user.emailVerified) return false;
  if (isGrandfatheredUser(user)) return false;
  return true;
}

export function isAccountSuspendedForEmail(user: {
  accountStatus: "ACTIVE" | "SUSPENDED";
}): boolean {
  return user.accountStatus === "SUSPENDED";
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "https://blocktrust.tech"
  );
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export async function sendVerificationEmailForUser(userId: string): Promise<{
  ok: boolean;
  reason?: "no_email" | "already_verified" | "send_failed";
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user?.email) return { ok: false, reason: "no_email" };
  if (user.emailVerified) return { ok: false, reason: "already_verified" };

  const token = await createEmailVerificationToken(user.id);
  const verifyUrl = `${appBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const firstName = resolveWelcomeFirstName(user.name, user.email);

  const { VerifyEmailEmail, subject } = await import("@/emails/VerifyEmailEmail");
  const { error } = await sendEmail({
    to: user.email,
    subject,
    react: React.createElement(VerifyEmailEmail, { firstName, verifyUrl }),
  });

  if (error) return { ok: false, reason: "send_failed" };
  return { ok: true };
}

export async function sendVerificationReminderForUser(
  userId: string,
  variant: "24h" | "72h",
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!user?.email || user.emailVerified) return false;

  const token = await createEmailVerificationToken(user.id);
  const verifyUrl = `${appBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const firstName = resolveWelcomeFirstName(user.name, user.email);

  const { EmailVerificationReminderEmail, subjectForVariant } = await import(
    "@/emails/EmailVerificationReminderEmail"
  );

  sendEmailFireAndForget({
    to: user.email,
    subject: subjectForVariant(variant),
    react: React.createElement(EmailVerificationReminderEmail, {
      firstName,
      verifyUrl,
      variant,
    }),
  });

  return true;
}

export type VerifyEmailTokenResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "expired" };

export async function verifyEmailByToken(token: string | null | undefined): Promise<VerifyEmailTokenResult> {
  const trimmed = token?.trim();
  if (!trimmed) return { ok: false, reason: "missing" };

  const tokenHash = hashToken(trimmed);
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, accountStatus: true } } },
  });

  if (!row) return { ok: false, reason: "invalid" };
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.emailVerificationToken.delete({ where: { id: row.id } }).catch(() => null);
    return { ok: false, reason: "expired" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        emailVerified: new Date(),
        accountStatus: "ACTIVE",
        emailVerificationReminderStage: 0,
      },
    }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } }),
  ]);

  return { ok: true };
}

export async function checkResendVerificationRateLimit(email: string): Promise<boolean> {
  const limiter = getResendVerificationLimiter();
  const result = await tryRedisLimit(limiter, email.trim().toLowerCase());
  if (!result) return true;
  return result.success;
}

export async function resendVerificationByEmail(email: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) {
    return { ok: false, message: "Indiquez une adresse email." };
  }

  const allowed = await checkResendVerificationRateLimit(emailNorm);
  if (!allowed) {
    return {
      ok: false,
      message: "Trop de demandes. Réessayez dans une heure.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: emailNorm },
    select: { id: true, emailVerified: true },
  });

  // Anti-énumération : réponse identique si compte absent
  if (!user) {
    return {
      ok: true,
      message: "Si un compte existe, un email de confirmation a été envoyé.",
    };
  }

  if (user.emailVerified) {
    return { ok: true, message: "Votre email est déjà confirmé." };
  }

  const sent = await sendVerificationEmailForUser(user.id);
  if (!sent.ok) {
    return {
      ok: false,
      message: "Impossible d'envoyer l'email pour le moment. Réessayez plus tard.",
    };
  }

  return {
    ok: true,
    message: "Email de confirmation renvoyé. Vérifiez votre boîte de réception.",
  };
}

export async function processEmailVerificationCron(): Promise<{
  reminders24h: number;
  reminders72h: number;
  suspended: number;
}> {
  const now = Date.now();
  const users = await prisma.user.findMany({
    where: {
      emailVerified: null,
      accountStatus: "ACTIVE",
      createdAt: { gte: EMAIL_VERIFICATION_REQUIRED_SINCE },
      email: { not: null },
    },
    select: {
      id: true,
      createdAt: true,
      emailVerificationReminderStage: true,
    },
  });

  let reminders24h = 0;
  let reminders72h = 0;
  let suspended = 0;

  for (const user of users) {
    const ageMs = now - user.createdAt.getTime();

    if (ageMs >= SUSPEND_AFTER_MS) {
      await prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: "SUSPENDED" },
      });
      suspended += 1;
      continue;
    }

    if (ageMs >= REMINDER_72H_MS && user.emailVerificationReminderStage < 2) {
      const sent = await sendVerificationReminderForUser(user.id, "72h");
      if (sent) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerificationReminderStage: 2 },
        });
        reminders72h += 1;
      }
      continue;
    }

    if (ageMs >= REMINDER_24H_MS && user.emailVerificationReminderStage < 1) {
      const sent = await sendVerificationReminderForUser(user.id, "24h");
      if (sent) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerificationReminderStage: 1 },
        });
        reminders24h += 1;
      }
    }
  }

  return { reminders24h, reminders72h, suspended };
}
