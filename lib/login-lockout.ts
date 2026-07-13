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

export const FAIL_THRESHOLD = 5;
const FAIL_TTL_SEC = 15 * 60;
const EXTENDED_LOCKOUT_SEC = 60 * 60;
const EXTENDED_LOCKOUT_COUNT = 3;

export type LoginLockoutOpen = {
  locked: false;
  failCount: number;
  attemptsRemaining: number;
};

export type LoginLockoutClosed = {
  locked: true;
  message: string;
  retryAfterSec: number;
  retryAfterMinutes: number;
  extended?: boolean;
  errorCode: string;
};

export type LoginLockoutStatus = LoginLockoutOpen | LoginLockoutClosed;

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

function attemptsRemainingFromFailCount(failCount: number): number {
  return Math.max(0, FAIL_THRESHOLD - failCount);
}

export function minutesFromRetrySec(retryAfterSec: number): number {
  if (retryAfterSec <= 0) return 1;
  return Math.max(1, Math.ceil(retryAfterSec / 60));
}

export function buildLockedErrorCode(retryAfterSec: number): string {
  return `LOCKED:${minutesFromRetrySec(retryAfterSec)}`;
}

export function buildFailedErrorCode(attemptsRemaining: number): string {
  return `FAILED:${Math.max(0, attemptsRemaining)}`;
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

async function redisTtl(key: string): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const ttl = await redis.ttl(key);
    return typeof ttl === "number" && ttl > 0 ? ttl : null;
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

async function buildLockedStatus(
  email: string,
  extended: boolean,
  fallbackSec: number,
): Promise<LoginLockoutClosed> {
  const ttl = (await redisTtl(lockoutKey(email))) ?? fallbackSec;
  const retryAfterMinutes = minutesFromRetrySec(ttl);
  return {
    locked: true,
    extended,
    retryAfterSec: ttl,
    retryAfterMinutes,
    errorCode: buildLockedErrorCode(ttl),
    message: `Compte temporairement verrouillé. Réessayez dans ${retryAfterMinutes} minute${retryAfterMinutes > 1 ? "s" : ""}.`,
  };
}

export async function checkLoginLockout(email: string): Promise<LoginLockoutStatus> {
  const locked = await redisGet(lockoutKey(email));
  if (locked) {
    const extended = locked === "extended";
    return buildLockedStatus(
      email,
      extended,
      extended ? EXTENDED_LOCKOUT_SEC : FAIL_TTL_SEC,
    );
  }
  return { locked: false, failCount: 0, attemptsRemaining: FAIL_THRESHOLD };
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
  const attemptsRemaining = attemptsRemainingFromFailCount(failCount);

  writeSecurityAuditLogFireAndForget({
    action: "LOGIN_FAILED",
    userId: options?.userId,
    resource: "auth",
    resourceId: hashAuditEmail(normalizeEmail(email)),
    ip: options?.ip,
    metadata: { attempts: failCount, attemptsRemaining },
  });

  if (failCount < FAIL_THRESHOLD) {
    return { locked: false, failCount, attemptsRemaining };
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

  return buildLockedStatus(email, extended, lockoutTtl);
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
