// lib/login-lockout.ts
// Lockout temporaire après tentatives login échouées (Upstash Redis)
// ============================================================

import { getRedis } from "@/lib/rate-limit-redis";
import { createAdminAlert } from "@/lib/admin-alerts";
import { sendEmailFireAndForget } from "@/lib/email";
import {
  hashAuditEmail,
  writeSecurityAuditLogFireAndForget,
} from "@/lib/security-audit";
import * as React from "react";
import { SecurityLockoutEmail } from "@/emails/SecurityLockoutEmail";

const FAIL_PREFIX = "bt:login:fail:";
const LOCKOUT_PREFIX = "bt:login:lockout:";
const LOCKOUT_COUNT_PREFIX = "bt:login:lockout-count:";

const FAIL_THRESHOLD = 5;
const FAIL_TTL_SEC = 15 * 60;
const EXTENDED_LOCKOUT_SEC = 60 * 60;
const EXTENDED_LOCKOUT_COUNT = 3;

export type LoginLockoutStatus =
  | { locked: false }
  | { locked: true; message: string; retryAfterSec?: number; extended?: boolean };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function failKey(email: string): string {
  return `${FAIL_PREFIX}${hashAuditEmail(normalizeEmail(email))}`;
}

function lockoutKey(email: string): string {
  return `${LOCKOUT_PREFIX}${hashAuditEmail(normalizeEmail(email))}`;
}

function lockoutCountKey(email: string): string {
  return `${LOCKOUT_COUNT_PREFIX}${hashAuditEmail(normalizeEmail(email))}`;
}

async function redisGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const val = await redis.get<string>(key);
    return val ?? null;
  } catch {
    return null;
  }
}

async function redisSetEx(key: string, value: string, ttlSec: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSec });
  } catch {
    /* fail-open */
  }
}

async function redisIncrEx(key: string, ttlSec: number): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttlSec);
    }
    return count;
  } catch {
    return 0;
  }
}

async function redisDel(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(...keys);
  } catch {
    /* fail-open */
  }
}

export async function checkLoginLockout(email: string): Promise<LoginLockoutStatus> {
  const locked = await redisGet(lockoutKey(email));
  if (locked) {
    const extended = locked === "extended";
    return {
      locked: true,
      extended,
      message: extended
        ? "Compte temporairement verrouillé. Réessayez dans 1 heure."
        : "Compte temporairement verrouillé. Réessayez dans 15 minutes.",
      retryAfterSec: extended ? EXTENDED_LOCKOUT_SEC : FAIL_TTL_SEC,
    };
  }
  return { locked: false };
}

/** Efface lockout + compteur d'échecs (inscription réussie, déblocage admin). */
export async function clearLoginLockout(email: string): Promise<void> {
  await redisDel(failKey(email), lockoutKey(email));
}

export async function recordLoginFailure(
  email: string,
  options?: { ip?: string | null; userId?: string | null },
): Promise<LoginLockoutStatus> {
  const failCount = await redisIncrEx(failKey(email), FAIL_TTL_SEC);

  writeSecurityAuditLogFireAndForget({
    action: "LOGIN_FAILED",
    userId: options?.userId,
    resource: "auth",
    resourceId: hashAuditEmail(normalizeEmail(email)),
    ip: options?.ip,
    metadata: { attempts: failCount },
  });

  if (failCount < FAIL_THRESHOLD) {
    return { locked: false };
  }

  const lockoutCount = await redisIncrEx(lockoutCountKey(email), 24 * 60 * 60);
  const extended = lockoutCount >= EXTENDED_LOCKOUT_COUNT;
  const lockoutTtl = extended ? EXTENDED_LOCKOUT_SEC : FAIL_TTL_SEC;

  await redisSetEx(lockoutKey(email), extended ? "extended" : "standard", lockoutTtl);

  writeSecurityAuditLogFireAndForget({
    action: "LOGIN_LOCKOUT",
    userId: options?.userId,
    resource: "auth",
    resourceId: hashAuditEmail(normalizeEmail(email)),
    ip: options?.ip,
    metadata: { attempts: failCount, extended, lockoutCount },
  });

  if (extended) {
    writeSecurityAuditLogFireAndForget({
      action: "BRUTE_FORCE_DETECTED",
      userId: options?.userId,
      resource: "auth",
      resourceId: hashAuditEmail(normalizeEmail(email)),
      ip: options?.ip,
      metadata: { lockoutCount },
    });

    void createAdminAlert({
      type: "BRUTE_FORCE_DETECTED",
      title: "Tentatives de connexion répétées",
      description: `Verrouillage étendu (1 h) pour un compte credentials.`,
      userId: options?.userId ?? undefined,
      metadata: { emailHash: hashAuditEmail(normalizeEmail(email)) },
    }).catch(() => null);

    if (email.includes("@")) {
      sendEmailFireAndForget({
        to: normalizeEmail(email),
        subject: "Alerte sécurité — tentatives de connexion BLOCKTRUST™",
        react: React.createElement(SecurityLockoutEmail, {
          resetPasswordUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://blocktrust.tech"}/auth/forgot-password`,
        }),
      });
    }
  }

  return {
    locked: true,
    extended,
    message: extended
      ? "Compte temporairement verrouillé. Réessayez dans 1 heure."
      : "Compte temporairement verrouillé. Réessayez dans 15 minutes.",
    retryAfterSec: lockoutTtl,
  };
}

export async function recordLoginSuccess(
  email: string,
  options?: { ip?: string | null; userId?: string | null },
): Promise<void> {
  await redisDel(failKey(email), lockoutKey(email));

  writeSecurityAuditLogFireAndForget({
    action: "LOGIN_SUCCESS",
    userId: options?.userId,
    resource: "auth",
    resourceId: hashAuditEmail(normalizeEmail(email)),
    ip: options?.ip,
  });
}
