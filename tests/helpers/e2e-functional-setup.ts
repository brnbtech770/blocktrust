/**
 * Helpers E2E fonctionnels — DB réelle + handlers API.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { prisma } from "@/app/lib/db";

export const E2E_PASSWORD = "SecurePass1!";
export const E2E_DOMAIN = "blocktrust-e2e.test";

export type E2ETracker = {
  userIds: string[];
  entityIds: string[];
  certIds: string[];
  relationIds: string[];
  vaultIds: string[];
  orgIds: string[];
  bisIds: string[];
};

export function createE2ETracker(): E2ETracker {
  return {
    userIds: [],
    entityIds: [],
    certIds: [],
    relationIds: [],
    vaultIds: [],
    orgIds: [],
    bisIds: [],
  };
}

export function e2eEmail(label: string, runId: string): string {
  return `e2e-${label}-${runId}@${E2E_DOMAIN}`.toLowerCase();
}

export async function hashE2EPassword(password = E2E_PASSWORD): Promise<string> {
  return bcrypt.hash(password, 10);
}

export type CreateUserOpts = {
  email: string;
  password?: string | null;
  emailVerified?: Date | null;
  createdAt?: Date;
  name?: string;
  sessionVersion?: number;
  extensionApiKeyHash?: string | null;
  accountDeletionScheduledAt?: Date | null;
  stripeCustomerId?: string | null;
  subscription?: {
    plan: string;
    status: string;
    stripeSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
  } | null;
  planType?: "B2C_PREMIUM" | "B2C_ESSENTIEL" | null;
};

export async function createE2EUser(
  tracker: E2ETracker,
  opts: CreateUserOpts,
): Promise<{ id: string; email: string }> {
  let planId: string | undefined;
  if (opts.planType) {
    const plan = await prisma.plan.findFirst({
      where: { type: opts.planType, isActive: true },
      select: { id: true },
    });
    planId = plan?.id;
  }

  const user = await prisma.user.create({
    data: {
      email: opts.email,
      name: opts.name ?? "E2E User",
      password: opts.password === null ? null : await hashE2EPassword(opts.password ?? E2E_PASSWORD),
      emailVerified: opts.emailVerified !== undefined ? opts.emailVerified : new Date(),
      sessionVersion: opts.sessionVersion ?? 0,
      createdAt: opts.createdAt,
      accountStatus: "ACTIVE",
      accountType: "PERSONAL",
      planId: planId ?? null,
      extensionApiKeyHash: opts.extensionApiKeyHash ?? null,
      accountDeletionScheduledAt: opts.accountDeletionScheduledAt ?? null,
      stripeCustomerId: opts.stripeCustomerId ?? null,
      cguAcceptedAt: new Date(),
    },
    select: { id: true, email: true },
  });

  tracker.userIds.push(user.id);

  if (opts.subscription) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: opts.subscription.plan,
        status: opts.subscription.status,
        stripeSubscriptionId: opts.subscription.stripeSubscriptionId ?? null,
        currentPeriodEnd: opts.subscription.currentPeriodEnd ?? null,
      },
    });
  }

  return { id: user.id, email: user.email! };
}

export async function createE2EEntity(
  tracker: E2ETracker,
  data: Prisma.EntityUncheckedCreateInput,
): Promise<{ id: string }> {
  const entity = await prisma.entity.create({ data });
  tracker.entityIds.push(entity.id);
  return { id: entity.id };
}

export async function createE2ECertificate(
  tracker: E2ETracker,
  data: Prisma.CertificateUncheckedCreateInput,
): Promise<{ id: string }> {
  const cert = await prisma.certificate.create({ data });
  tracker.certIds.push(cert.id);
  return { id: cert.id };
}

export async function createE2EOrgWithVault(
  tracker: E2ETracker,
  ownerId: string,
): Promise<{ orgId: string; vaultId: string }> {
  const org = await prisma.organization.create({
    data: {
      name: `E2E Org ${randomBytes(4).toString("hex")}`,
      tier: "B2B_ENTERPRISE",
      ownerId,
    },
  });
  tracker.orgIds.push(org.id);

  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: ownerId,
      role: "OWNER",
      joinedAt: new Date(),
    },
  });

  const vault = await prisma.trustVault.create({
    data: {
      organizationId: org.id,
      name: "E2E Vault",
    },
  });
  tracker.vaultIds.push(vault.id);

  return { orgId: org.id, vaultId: vault.id };
}

export async function cleanupE2EData(tracker: E2ETracker): Promise<void> {
  const {
    userIds,
    entityIds,
    certIds,
    relationIds,
    vaultIds,
    orgIds,
    bisIds,
  } = tracker;

  if (bisIds.length) {
    await prisma.interactionSignature.deleteMany({ where: { id: { in: bisIds } } }).catch(() => null);
  }
  if (relationIds.length) {
    await prisma.userTrustRelation.deleteMany({ where: { id: { in: relationIds } } }).catch(() => null);
  }
  if (certIds.length) {
    await prisma.certificate.deleteMany({ where: { id: { in: certIds } } }).catch(() => null);
  }
  if (entityIds.length) {
    await prisma.entity.deleteMany({ where: { id: { in: entityIds } } }).catch(() => null);
  }
  if (vaultIds.length) {
    await prisma.trustVaultEntry.deleteMany({ where: { vaultId: { in: vaultIds } } }).catch(() => null);
    await prisma.trustVault.deleteMany({ where: { id: { in: vaultIds } } }).catch(() => null);
  }
  if (orgIds.length) {
    await prisma.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } }).catch(() => null);
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } }).catch(() => null);
  }
  if (userIds.length) {
    await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: userIds } } }).catch(() => null);
    await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => null);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => null);
  }
}

export function registerPayload(email: string) {
  return {
    firstName: "Jean",
    lastName: "Test",
    email,
    password: E2E_PASSWORD,
    acceptCgu: true,
    website: "",
    formLoadedAt: Date.now() - 5000,
    turnstileBypass: true,
  };
}

export const VALID_IBAN = "FR7630006000011234567890189";
export const VALID_IBAN_SPACED = "FR76 3000 6000 0112 3456 7890 189";
export const VALID_SIRET = "73282932000074";

export function randomSiret(): string {
  const base = String(Math.floor(Math.random() * 1e13)).padStart(13, "0");
  return base.slice(0, 14);
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function isE2EDatabaseReady(): Promise<boolean> {
  if (!hasDatabase) return false;
  try {
    const rows = await prisma.$queryRaw<Array<{ enum_ok: boolean; table_ok: boolean }>>`
      SELECT
        EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public' AND t.typname = 'UserAccountStatus'
        ) AS enum_ok,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'EmailVerificationToken'
        ) AS table_ok
    `;
    return rows[0]?.enum_ok === true && rows[0]?.table_ok === true;
  } catch {
    return false;
  }
}

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export function validExtensionApiKey(seed: string): string {
  const hex = createHash("sha256").update(`e2e-ext-${seed}`).digest("hex");
  return `bt_ext_${hex}`;
}

export const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);
export const hasJwtKey = Boolean(process.env.BLOCKTRUST_JWT_PRIVATE_KEY?.trim());
export const hasNextAuthSecret = Boolean(process.env.NEXTAUTH_SECRET?.trim());

/** Email admin dashboard hardcodé (lib/admin-utils). */
export const HARDCODED_ADMIN_EMAIL = "deborahbernabe@gmail.com";
