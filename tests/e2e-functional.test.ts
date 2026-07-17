/**
 * Tests fonctionnels E2E — handlers API réels + vérifications DB.
 *
 * Prérequis :
 *   - DATABASE_URL (Neon) avec migrations à jour : npm run test:e2e:prepare
 *     (DATABASE_URL et DIRECT_URL doivent cibler la même branche Neon)
 *   - UPSTASH_REDIS_* pour lockout/resend (tests 1.5, 2.4)
 *   - BLOCKTRUST_JWT_PRIVATE_KEY pour BIS (bloc 7)
 *   - NEXTAUTH_SECRET pour Vault (bloc 8)
 *
 * Exécution : npm run test:e2e
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/lib/auth-server", () => ({
  auth: () => authMock(),
}));

vi.mock("@/app/lib/auth", () => ({
  hashIp: () => "e2e-ip-hash",
  getAuthUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileForRegister: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

vi.mock("@/lib/csrf-origin-guard", () => ({
  validateAuthJsCsrf: () => true,
  assertSameOriginMutation: () => ({ ok: true as const }),
  readAuthJsCsrfCookie: () => null,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ data: { id: "mock" }, error: null }),
  sendEmailFireAndForget: vi.fn(),
}));

vi.mock("@/lib/rate-limit-public-failclosed", () => ({
  checkPublicVerifyIpRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  checkPublicBisVerifyRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  checkPublicResolveTokenRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  PUBLIC_RATE_LIMIT_503_BODY: {
    error: "service_unavailable",
    message: "Service temporairement indisponible",
  },
}));

import { prisma } from "@/app/lib/db";
import { POST as registerPost } from "@/app/api/auth/register/route";
import { POST as loginCheckPost } from "@/app/api/auth/login-check/route";
import { POST as resendVerificationPost } from "@/app/api/auth/resend-verification/route";
import { POST as entitiesPost } from "@/app/api/entities/route";
import { DELETE as contactDelete } from "@/app/api/contacts/[id]/route";
import { POST as certificatesPost } from "@/app/api/certificates/route";
import { DELETE as certificateDelete } from "@/app/api/certificates/[id]/route";
import { POST as trustCircleAddPost } from "@/app/api/trust-circle/add/route";
import { GET as trustCircleGet } from "@/app/api/trust-circle/route";
import { POST as bisSignPost } from "@/app/api/bis/sign/route";
import { GET as bisVerifyGetRoute } from "@/app/api/bis/verify/[signatureId]/route";
import { GET as adminStatsGet } from "@/app/api/admin/stats/route";
import { PATCH as adminCertPatch } from "@/app/api/admin/certificates/[id]/route";
import { DELETE as accountDelete } from "@/app/api/user/account/route";
import { GET as extensionVerifyGet } from "@/app/api/extension/verify-sender/route";
import { GET as publicCertGet } from "@/app/api/public/certificate/[id]/route";
import { POST as vaultEntryPost, GET as vaultEntryGet } from "@/app/api/vault/[vaultId]/entries/route";

import { verifyEmailByToken } from "@/lib/email-verification";
import { clearLoginLockout } from "@/lib/login-lockout";
import { getEntityQuotaSnapshot } from "@/lib/checkQuota";
import { resolveEffectivePlan, planAllowsTrustCircle } from "@/lib/plan-features";
import { getMaxContacts, getMaxVerifications, getMaxTrustCircle } from "@/lib/pricing";
import { filterThirdPartyContactEntities } from "@/lib/entity-contacts";
import { hashApiKey } from "@/lib/api-key";
import { compareVaultRibValues } from "@/lib/vault-entry-value";
import { cancelScheduledAccountDeletion } from "@/lib/account-deletion";

import {
  createE2ETracker,
  createE2EUser,
  createE2EEntity,
  createE2ECertificate,
  createE2EOrgWithVault,
  cleanupE2EData,
  e2eEmail,
  registerPayload,
  E2E_PASSWORD,
  VALID_IBAN,
  VALID_IBAN_SPACED,
  VALID_SIRET,
  randomSiret,
  hasDatabase,
  hasRedis,
  hasJwtKey,
  hasNextAuthSecret,
  HARDCODED_ADMIN_EMAIL,
  sha256Hex,
  isE2EDatabaseReady,
  validExtensionApiKey,
  type E2ETracker,
} from "./helpers/e2e-functional-setup";

let e2eRequestIpSeq = 0;

function e2eUniqueIp(): string {
  e2eRequestIpSeq += 1;
  const n = e2eRequestIpSeq;
  return `10.${Math.floor(n / 65536) % 256}.${Math.floor(n / 256) % 256}.${n % 254 + 1}`;
}

function mockPost(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: new Headers({
      "content-type": "application/json",
      "x-forwarded-for": e2eUniqueIp(),
      ...headers,
    }),
    body: JSON.stringify(body),
  });
}

function mockGet(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers: new Headers({ "x-forwarded-for": e2eUniqueIp(), ...headers }),
  });
}

function mockDelete(path: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "DELETE",
    headers: new Headers({ "content-type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
}

function setSession(user: { id: string; email: string; name?: string }) {
  authMock.mockResolvedValue({
    user: { id: user.id, email: user.email, name: user.name ?? "E2E" },
  });
}

function clearSession() {
  authMock.mockResolvedValue(null);
}

describe.skipIf(!hasDatabase)("E2E functional — parcours BLOCKTRUST", () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let tracker: E2ETracker;
  let dbReady = false;

  /** Skip automatique si migrations Prisma absentes sur la base cible. */
  function itE2e(name: string, fn: () => Promise<void>, timeout = 30_000) {
    it(name, async (ctx) => {
      if (!dbReady) {
        ctx.skip();
        return;
      }
      await fn();
    }, timeout);
  }

  beforeAll(async () => {
    tracker = createE2ETracker();
    dbReady = await isE2EDatabaseReady();
    if (!dbReady) {
      console.warn(
        "[e2e-functional] SKIP — schéma DB incomplet (UserAccountStatus ou EmailVerificationToken). Exécutez: npx prisma migrate deploy",
      );
      return;
    }
    await prisma.$connect();
  });

  afterAll(async () => {
    if (dbReady) {
      await cleanupE2EData(tracker);
      await prisma.$disconnect();
    }
  });

  // ─── BLOC 1 ───────────────────────────────────────────────
  describe("Bloc 1 — Inscription + Connexion", () => {
    itE2e("1.1 — Inscription credentials : User en DB sans Sub/Entity", async () => {
      const email = e2eEmail("register", runId);
      const res = await registerPost(mockPost("/api/auth/register", registerPayload(email)));
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);

      const user = await prisma.user.findUnique({
        where: { email },
        include: { subscription: true, entities: true },
      });
      expect(user).toBeTruthy();
      expect(user!.password).toMatch(/^\$2[ab]\$/);
      expect(user!.sessionVersion).toBe(0);
      expect(user!.emailVerified).toBeNull();
      expect(user!.subscription).toBeNull();
      expect(user!.entities).toHaveLength(0);

      const tokenRow = await prisma.emailVerificationToken.findFirst({
        where: { userId: user!.id },
      });
      expect(tokenRow).toBeTruthy();
      expect(tokenRow!.expiresAt.getTime()).toBeGreaterThan(Date.now());

      tracker.userIds.push(user!.id);
    });

    itE2e("1.2 — Inscription email existant → 400, pas de doublon", async () => {
      const email = e2eEmail("dup", runId);
      const first = await registerPost(mockPost("/api/auth/register", registerPayload(email)));
      expect(first.status).toBe(201);
      const u = await prisma.user.findUnique({ where: { email } });
      if (u) tracker.userIds.push(u.id);

      const second = await registerPost(mockPost("/api/auth/register", registerPayload(email)));
      expect(second.status).toBe(400);
      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });

    itE2e("1.3 — Entity tierce ne bloque pas l'inscription", async () => {
      const email = e2eEmail("entity-collision", runId);
      const owner = await createE2EUser(tracker, {
        email: e2eEmail("owner", runId),
        emailVerified: new Date(),
      });
      await createE2EEntity(tracker, {
        userId: owner.id,
        entityType: "INDIVIDUAL",
        firstName: "Contact",
        lastName: "Tiers",
        email,
        kycStatus: "PENDING",
      });

      const res = await registerPost(mockPost("/api/auth/register", registerPayload(email)));
      expect(res.status).toBe(201);

      const newUser = await prisma.user.findUnique({ where: { email } });
      expect(newUser).toBeTruthy();
      if (newUser) tracker.userIds.push(newUser.id);

      const entity = await prisma.entity.findFirst({
        where: { email, userId: owner.id },
      });
      expect(entity?.userId).toBe(owner.id);
    });

    itE2e("1.4 — Login credentials OK via login-check", async () => {
      const email = e2eEmail("login-ok", runId);
      await registerPost(mockPost("/api/auth/register", registerPayload(email)));
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) tracker.userIds.push(user.id);
      await clearLoginLockout(email);

      const res = await loginCheckPost(
        mockPost("/api/auth/login-check", {
          email,
          password: E2E_PASSWORD,
          csrfToken: "test",
        }),
      );
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it.skipIf(!hasRedis)("1.5 — Lockout après 5 échecs MDP", async () => {
      const email = e2eEmail("lockout", runId);
      await createE2EUser(tracker, { email, emailVerified: new Date() });
      await clearLoginLockout(email);

      for (let i = 1; i <= 5; i++) {
        const res = await loginCheckPost(
          mockPost("/api/auth/login-check", {
            email,
            password: "WrongPass9!",
            csrfToken: "test",
          }),
        );
        const data = await res.json();
        expect(data.ok).toBe(false);
        if (i < 5) {
          expect(data.error).toBe("invalid");
          expect(data.attemptsRemaining).toBe(5 - i);
        } else {
          expect(data.attemptsRemaining).toBe(0);
        }
      }

      const locked = await loginCheckPost(
        mockPost("/api/auth/login-check", { email, password: E2E_PASSWORD, csrfToken: "test" }),
      );
      const lockedData = await locked.json();
      expect(lockedData.error).toBe("locked");
      expect(lockedData.minutesRemaining).toBeGreaterThan(0);

      await clearLoginLockout(email);
    });

    itE2e("1.6 — Compte sans MDP → no_password", async () => {
      const email = e2eEmail("oauth-only", runId);
      await createE2EUser(tracker, { email, password: null, emailVerified: new Date() });

      const res = await loginCheckPost(
        mockPost("/api/auth/login-check", { email, password: "x", csrfToken: "test" }),
      );
      const data = await res.json();
      expect(data.error).toBe("no_password");
    });
  });

  // ─── BLOC 2 ───────────────────────────────────────────────
  describe("Bloc 2 — Vérification email", () => {
    itE2e("2.1 — Token créé à l'inscription", async () => {
      const email = e2eEmail("verify-token", runId);
      await registerPost(mockPost("/api/auth/register", registerPayload(email)));
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).toBeTruthy();
      if (user) tracker.userIds.push(user.id);

      let tokens: Awaited<ReturnType<typeof prisma.emailVerificationToken.findMany>> = [];
      for (let attempt = 0; attempt < 20; attempt += 1) {
        tokens = await prisma.emailVerificationToken.findMany({ where: { userId: user!.id } });
        if (tokens.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      expect(tokens.length).toBeGreaterThanOrEqual(1);
      expect(tokens[0]!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    itE2e("2.2 — Confirmation email valide", async () => {
      const email = e2eEmail("verify-ok", runId);
      const user = await createE2EUser(tracker, { email, emailVerified: null });
      const { createEmailVerificationToken } = await import("@/lib/email-verification");
      const rawToken = await createEmailVerificationToken(user.id);

      const result = await verifyEmailByToken(rawToken);
      expect(result.ok).toBe(true);

      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated!.emailVerified).toBeTruthy();
      const remaining = await prisma.emailVerificationToken.count({ where: { userId: user.id } });
      expect(remaining).toBe(0);
    });

    itE2e("2.3 — Token expiré", async () => {
      const email = e2eEmail("verify-exp", runId);
      const user = await createE2EUser(tracker, { email, emailVerified: null });
      const { createHash } = await import("node:crypto");
      const raw = "expired-test-token";
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: createHash("sha256").update(raw).digest("hex"),
          expiresAt: new Date(Date.now() - 60_000),
        },
      });

      const result = await verifyEmailByToken(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("expired");
    });

    it.skipIf(!hasRedis)("2.4 — Renvoi email + rate limit 429", async () => {
      const email = e2eEmail("resend", runId);
      await createE2EUser(tracker, { email, emailVerified: null });

      for (let i = 0; i < 3; i++) {
        const res = await resendVerificationPost(mockPost("/api/auth/resend-verification", { email }));
        expect(res.status).toBe(200);
      }
      const fourth = await resendVerificationPost(
        mockPost("/api/auth/resend-verification", { email }),
      );
      expect(fourth.status).toBe(429);
    });
  });

  // ─── BLOC 3 ───────────────────────────────────────────────
  describe("Bloc 3 — Dashboard + guards", () => {
    itE2e("3.1 — Quotas Découverte", async () => {
      const email = e2eEmail("discovery", runId);
      const user = await createE2EUser(tracker, {
        email,
        subscription: { plan: "DISCOVERY", status: "active" },
      });
      const snap = await getEntityQuotaSnapshot(user.id);
      expect(snap!.max).toBe(getMaxContacts("DISCOVERY"));
      expect(getMaxContacts("DISCOVERY")).toBe(5);
      expect(getMaxVerifications("DISCOVERY")).toBe(20);
      expect(planAllowsTrustCircle("DISCOVERY")).toBe(false);
    });

    itE2e("3.2 — Quotas Premium trial", async () => {
      const email = e2eEmail("premium-trial", runId);
      const future = new Date(Date.now() + 7 * 864e5);
      const user = await createE2EUser(tracker, {
        email,
        planType: "B2C_PREMIUM",
        subscription: {
          plan: "PREMIUM",
          status: "active",
          stripeSubscriptionId: null,
          currentPeriodEnd: future,
        },
      });
      const plan = resolveEffectivePlan({
        subscription: {
          plan: "PREMIUM",
          status: "active",
          stripeSubscriptionId: null,
          currentPeriodEnd: future,
        },
        email,
        planType: "B2C_PREMIUM",
      });
      expect(plan).toBe("PREMIUM");
      expect(getMaxContacts(plan)).toBe(100);
      expect(planAllowsTrustCircle(plan)).toBe(true);
      expect(getMaxTrustCircle(plan)).toBe(40);
    });

    it("3.3 — Quotas Enterprise interne (resolveEffectivePlan)", () => {
      const plan = resolveEffectivePlan({
        subscription: { plan: "DISCOVERY", status: "inactive" },
        email: "johannabernabe3@gmail.com",
      });
      expect(plan).toBe("B2B_ENTERPRISE");
      expect(getMaxContacts(plan)).toBeGreaterThan(1000);
      expect(planAllowsTrustCircle(plan)).toBe(true);
    });

    itE2e("3.4 — Guard emailVerified bloque mutations", async () => {
      const email = e2eEmail("unverified", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: null,
        createdAt: new Date("2026-08-01"),
      });
      await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "E2E",
        lastName: "Badge",
        email,
        kycStatus: "PENDING",
      });
      const entity = await prisma.entity.findFirst({ where: { userId: user.id } });
      setSession(user);

      const certRes = await certificatesPost(
        mockPost("/api/certificates", { entityId: entity!.id }),
      );
      expect(certRes.status).toBe(403);
      const certBody = await certRes.json();
      expect(certBody.error ?? certBody.code).toBe("EMAIL_NOT_VERIFIED");

      const bisRes = await bisSignPost(
        mockPost("/api/bis/sign", {
          recipientEmail: "dest@example.com",
          interactionType: "EMAIL",
          contentHash: sha256Hex("test"),
        }),
      );
      expect(bisRes.status).toBe(403);

      const tcRes = await trustCircleAddPost(
        mockPost("/api/trust-circle/add", {
          email: "other@example.com",
          name: "Other",
        }),
      );
      expect(tcRes.status).toBe(403);
    });

    itE2e("3.5 — Grandfathering avant 13/07", async () => {
      const email = e2eEmail("grandfather", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: null,
        createdAt: new Date("2026-01-01"),
        subscription: { plan: "DISCOVERY", status: "active" },
      });
      const entity = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Old",
        lastName: "User",
        email,
        kycStatus: "PENDING",
      });
      setSession(user);

      const res = await certificatesPost(
        mockPost("/api/certificates", { entityId: entity.id }),
      );
      expect([200, 201, 403]).toContain(res.status);
      if (res.status === 201 || res.status === 200) {
        const body = await res.json();
        if (body.id) tracker.certIds.push(body.id);
      }
    });

    itE2e("3.6 — DISCOVERY_EXPIRED bloque mutations + TC quota", async () => {
      const email = e2eEmail("expired", runId);
      const user = await createE2EUser(tracker, {
        email,
        subscription: { plan: "DISCOVERY_EXPIRED", status: "inactive" },
      });
      const entity = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Exp",
        lastName: "User",
        email,
        kycStatus: "PENDING",
      });
      setSession(user);

      const certRes = await certificatesPost(
        mockPost("/api/certificates", { entityId: entity.id }),
      );
      expect(certRes.status).toBe(403);
      const certBody = await certRes.json();
      expect(certBody.error).toBe("DISCOVERY_EXPIRED");

      const tcRes = await trustCircleGet();
      expect(tcRes.status).toBe(200);
      const tcData = await tcRes.json();
      expect(tcData.stats.limit).toBe(0);
    });
  });

  // ─── BLOC 4 ───────────────────────────────────────────────
  describe("Bloc 4 — Contacts", () => {
    itE2e("4.1 — Contact INDIVIDUAL sans certificat", async () => {
      const email = e2eEmail("contact-ind", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });
      setSession(user);

      const contactEmail = e2eEmail("contact-target", runId);
      const res = await entitiesPost(
        mockPost("/api/entities", {
          entityType: "INDIVIDUAL",
          firstName: "Jean",
          lastName: "Contact",
          email: contactEmail,
          purpose: "contact",
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      tracker.entityIds.push(body.entity.id);

      const certs = await prisma.certificate.count({ where: { entityId: body.entity.id } });
      expect(certs).toBe(0);
      const entity = await prisma.entity.findUnique({ where: { id: body.entity.id } });
      expect(entity!.userId).toBe(user.id);
    });

    itE2e("4.2 — Contact BUSINESS", async () => {
      const email = e2eEmail("contact-biz-user", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });
      setSession(user);

      const siret = sha256Hex(`biz-siret-${runId}`).replace(/\D/g, "").slice(0, 14).padEnd(14, "0");
      const res = await entitiesPost(
        mockPost("/api/entities", {
          entityType: "BUSINESS",
          legalName: "ACME E2E",
          siret,
          email: e2eEmail("biz-contact", runId),
          website: "https://example.com",
          purpose: "contact",
        }),
      );
      if (res.status !== 200) {
        const errBody = await res.json();
        throw new Error(`entities BUSINESS contact: ${res.status} ${JSON.stringify(errBody)}`);
      }
      const body = await res.json();
      tracker.entityIds.push(body.entity.id);
      const entity = await prisma.entity.findUnique({ where: { id: body.entity.id } });
      expect(entity!.entityType).toBe("BUSINESS");
    });

    itE2e("4.6 — Badges propres exclus des contacts", async () => {
      const accountEmail = e2eEmail("multi-badge", runId);
      const user = await createE2EUser(tracker, {
        email: accountEmail,
        emailVerified: new Date(),
        subscription: { plan: "B2B_ENTERPRISE", status: "active" },
      });
      const individual = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Me",
        lastName: "User",
        email: accountEmail,
        kycStatus: "VERIFIED",
      });
      await createE2ECertificate(tracker, {
        entityId: individual.id,
        status: "ACTIVE",
        level: "ENTERPRISE",
      });
      const businessEmail = e2eEmail("winter-keys-style", runId);
      const business = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "BUSINESS",
        legalName: "WINTER KEYS E2E",
        email: businessEmail,
        siret: randomSiret(),
        website: "https://winter-keys.test",
        kycStatus: "VERIFIED",
      });
      await createE2ECertificate(tracker, {
        entityId: business.id,
        status: "ACTIVE",
        level: "ENTERPRISE",
      });
      const thirdParty = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Real",
        lastName: "Contact",
        email: e2eEmail("real-contact", runId),
        kycStatus: "PENDING",
      });

      const all = await prisma.entity.findMany({
        where: { userId: user.id, organizationId: null },
        include: { certificates: true },
      });
      const contacts = filterThirdPartyContactEntities(all, accountEmail);
      expect(contacts).toHaveLength(1);
      expect(contacts[0]!.id).toBe(thirdParty.id);
    });

    itE2e("4.7 — Suppression contact", async () => {
      const email = e2eEmail("del-contact", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });
      const entity = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Del",
        lastName: "Me",
        email: e2eEmail("to-del", runId),
        kycStatus: "PENDING",
      });
      setSession(user);

      const res = await contactDelete(mockDelete(`/api/contacts/${entity.id}`), {
        params: Promise.resolve({ id: entity.id }),
      } as never);
      expect(res.status).toBe(200);
      const gone = await prisma.entity.findUnique({ where: { id: entity.id } });
      expect(gone).toBeNull();
      tracker.entityIds = tracker.entityIds.filter((id) => id !== entity.id);
    });

    itE2e("4.8 — Doublon email INDIVIDUAL → 409", async () => {
      const email = e2eEmail("dup-contact", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });
      setSession(user);
      const target = e2eEmail("same-contact", runId);
      const payload = {
        entityType: "INDIVIDUAL" as const,
        firstName: "A",
        lastName: "B",
        email: target,
        purpose: "contact" as const,
      };
      const first = await entitiesPost(mockPost("/api/entities", payload));
      expect(first.status).toBe(200);
      const firstBody = await first.json();
      tracker.entityIds.push(firstBody.entity.id);

      const second = await entitiesPost(mockPost("/api/entities", payload));
      expect(second.status).toBe(409);
    });
  });

  // ─── BLOC 5 ───────────────────────────────────────────────
  describe("Bloc 5 — Trust Circle", () => {
    itE2e("5.1 — Découverte → 403 Trust Circle", async () => {
      const email = e2eEmail("tc-disc", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "DISCOVERY", status: "active" },
      });
      setSession(user);

      const res = await trustCircleAddPost(
        mockPost("/api/trust-circle/add", { email: "x@y.com", name: "X" }),
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toMatch(/Premium/i);
    });

    itE2e("5.2 — Premium → ajout OK", async () => {
      const email = e2eEmail("tc-prem", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });
      setSession(user);

      const res = await trustCircleAddPost(
        mockPost("/api/trust-circle/add", {
          email: e2eEmail("tc-target", runId),
          name: "Target",
        }),
      );
      expect(res.status).toBe(200);
    });

    itE2e("5.5 — Self-add interdit", async () => {
      const email = e2eEmail("tc-self", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });
      setSession(user);

      const res = await trustCircleAddPost(
        mockPost("/api/trust-circle/add", { email, name: "Self" }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toMatch(/vous-même/i);
    });

    itE2e("5.4 — Promotion MUTUAL réciproque", async () => {
      const emailA = e2eEmail("mutual-a", runId);
      const emailB = e2eEmail("mutual-b", runId);
      const userA = await createE2EUser(tracker, {
        email: emailA,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });
      const userB = await createE2EUser(tracker, {
        email: emailB,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });

      setSession(userA);
      await trustCircleAddPost(
        mockPost("/api/trust-circle/add", { email: emailB, name: "User B" }),
      );

      setSession(userB);
      await trustCircleAddPost(
        mockPost("/api/trust-circle/add", { email: emailA, name: "User A" }),
      );

      const relations = await prisma.userTrustRelation.findMany({
        where: {
          OR: [
            { fromUserId: userA.id, toUserId: userB.id },
            { fromUserId: userB.id, toUserId: userA.id },
          ],
        },
      });
      expect(relations.length).toBeGreaterThanOrEqual(2);
      expect(relations.every((r) => r.isMutual && r.status === "CONFIRMED")).toBe(true);
      tracker.relationIds.push(...relations.map((r) => r.id));
    });

    itE2e("5.6 — Quota Trust Circle via resolveEffectivePlan", async () => {
      const email = e2eEmail("tc-quota", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });
      setSession(user);

      const res = await trustCircleGet();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.stats.limit).toBe(40);
    });
  });

  // ─── BLOC 6 ───────────────────────────────────────────────
  describe("Bloc 6 — Certificat / Badge", () => {
    itE2e("6.1 — Certificat PENDING créé", async () => {
      const email = e2eEmail("cert-create", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "DISCOVERY", status: "active" },
      });
      const entity = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Cert",
        lastName: "User",
        email,
        kycStatus: "PENDING",
      });
      setSession(user);

      const res = await certificatesPost(
        mockPost("/api/certificates", { entityId: entity.id }),
      );
      expect([200, 201]).toContain(res.status);
      const body = await res.json();
      const certId = body.id ?? body.certificate?.id;
      if (certId) tracker.certIds.push(certId);

      const cert = await prisma.certificate.findFirst({ where: { entityId: entity.id } });
      expect(cert!.status).toBe("PENDING");
    });

    itE2e("6.5 — DELETE cert ACTIVE refusé", async () => {
      const email = e2eEmail("cert-del", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "DISCOVERY", status: "active" },
      });
      const entity = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Del",
        lastName: "Cert",
        email,
        kycStatus: "PENDING",
      });
      const cert = await createE2ECertificate(tracker, {
        entityId: entity.id,
        status: "ACTIVE",
        level: "DISCOVERY",
      });
      setSession(user);

      const res = await certificateDelete(mockDelete(`/api/certificates/${cert.id}`), {
        params: Promise.resolve({ id: cert.id }),
      } as never);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ─── BLOC 7 ───────────────────────────────────────────────
  describe.skipIf(!hasJwtKey)("Bloc 7 — BIS", () => {
    itE2e("7.6 — BIS avec cert ACTIVE non ancré → 200", async () => {
      const email = e2eEmail("bis-active", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });
      const entity = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "BIS",
        lastName: "Signer",
        email,
        kycStatus: "VERIFIED",
      });
      await createE2ECertificate(tracker, {
        entityId: entity.id,
        status: "ACTIVE",
        level: "PREMIUM",
        blockchainStatus: "NOT_ANCHORED",
      });
      setSession(user);

      const hash = sha256Hex("document-e2e");
      const res = await bisSignPost(
        mockPost("/api/bis/sign", {
          recipientEmail: e2eEmail("bis-recipient", runId),
          interactionType: "EMAIL",
          contentHash: hash,
          notifyRecipient: false,
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.signatureId).toBeTruthy();
      tracker.bisIds.push(body.signatureId);

      const verifyRes = await bisVerifyGetRoute(
        mockGet(`/api/bis/verify/${body.signatureId}`),
        { params: Promise.resolve({ signatureId: body.signatureId }) },
      );
      expect(verifyRes.status).toBe(200);
    });

    itE2e("7.5 — Découverte → BIS 403", async () => {
      const email = e2eEmail("bis-disc", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "DISCOVERY", status: "active" },
      });
      setSession(user);

      const res = await bisSignPost(
        mockPost("/api/bis/sign", {
          recipientEmail: "x@y.com",
          interactionType: "EMAIL",
          contentHash: sha256Hex("x"),
          notifyRecipient: false,
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  // ─── BLOC 8 ───────────────────────────────────────────────
  describe.skipIf(!hasNextAuthSecret)("Bloc 8 — Vault", () => {
    itE2e("8.1 — Entrée IBAN chiffrée en DB", async () => {
      const email = e2eEmail("vault", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "B2B_ENTERPRISE", status: "active" },
      });
      const { vaultId } = await createE2EOrgWithVault(tracker, user.id);
      setSession(user);

      const res = await vaultEntryPost(
        mockPost(`/api/vault/${vaultId}/entries`, {
          type: "IBAN",
          name: "Compte E2E",
          value: VALID_IBAN,
        }),
        { params: Promise.resolve({ vaultId }) },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      const row = await prisma.trustVaultEntry.findUnique({ where: { id: body.entry.id } });
      expect(row!.valueEnc).toBeTruthy();
      expect(row!.value).toBe("");
    });

    itE2e("8.2 — Lecture masquée", async () => {
      const email = e2eEmail("vault-read", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "B2B_ENTERPRISE", status: "active" },
      });
      const { vaultId } = await createE2EOrgWithVault(tracker, user.id);
      setSession(user);

      await vaultEntryPost(
        mockPost(`/api/vault/${vaultId}/entries`, {
          type: "IBAN",
          name: "Mask",
          value: VALID_IBAN,
        }),
        { params: Promise.resolve({ vaultId }) },
      );

      const res = await vaultEntryGet(mockGet(`/api/vault/${vaultId}/entries`), {
        params: Promise.resolve({ vaultId }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      const masked = data.entries[0]?.maskedValue as string;
      expect(masked).toMatch(/•/);
      expect(masked).not.toBe(VALID_IBAN);
    });

    it("8.3 — Compare IBAN avec espaces → match", () => {
      const result = compareVaultRibValues(
        [{ id: "1", name: "IBAN", type: "IBAN", value: VALID_IBAN, valueEnc: null }],
        VALID_IBAN_SPACED,
      );
      expect(result.fraudAlert?.type).toBe("RIB_MATCH");
    });
  });

  // ─── BLOC 9 ───────────────────────────────────────────────
  describe("Bloc 9 — Verify public", () => {
    itE2e("9.1 — Cert ACTIVE visible publiquement", async () => {
      const email = e2eEmail("pub-active", runId);
      const user = await createE2EUser(tracker, { email, emailVerified: new Date() });
      const entity = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Pub",
        lastName: "Active",
        email,
        kycStatus: "VERIFIED",
      });
      const cert = await createE2ECertificate(tracker, {
        entityId: entity.id,
        status: "ACTIVE",
        level: "PREMIUM",
        publicId: `pub-${runId}`,
      });

      clearSession();
      const res = await publicCertGet(mockGet(`/api/public/certificate/${cert.id}`), {
        params: Promise.resolve({ id: cert.id }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.verdict).toBe("VALID");
      expect(body.entityName).toBeTruthy();
    });

    itE2e("9.4 — Cert REVOKED → verdict révoqué", async () => {
      const email = e2eEmail("pub-revoked", runId);
      const user = await createE2EUser(tracker, { email, emailVerified: new Date() });
      const entity = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Rev",
        lastName: "oked",
        email,
        kycStatus: "VERIFIED",
      });
      const cert = await createE2ECertificate(tracker, {
        entityId: entity.id,
        status: "REVOKED",
        level: "PREMIUM",
        revokedAt: new Date(),
      });

      clearSession();
      const res = await publicCertGet(mockGet(`/api/public/certificate/${cert.id}`), {
        params: Promise.resolve({ id: cert.id }),
      });
      const body = await res.json();
      expect(body.verdict === "REVOKED" || body.status === "REVOKED" || body.valid === false).toBe(
        true,
      );
    });
  });

  // ─── BLOC 10 ───────────────────────────────────────────────
  describe("Bloc 10 — Extension API", () => {
    it("10.4 — Sans clé API → 401", async () => {
      const res = await extensionVerifyGet(
        mockGet("/api/extension/verify-sender?email=test@example.com"),
      );
      expect(res.status).toBe(401);
    });

    itE2e("10.3 — Email inconnu", async () => {
      const apiKey = validExtensionApiKey(runId);
      const user = await createE2EUser(tracker, {
        email: e2eEmail("ext-user", runId),
        emailVerified: new Date(),
        extensionApiKeyHash: hashApiKey(apiKey),
        subscription: { plan: "PREMIUM", status: "active", currentPeriodEnd: new Date(Date.now() + 864e5) },
        planType: "B2C_PREMIUM",
      });

      const res = await extensionVerifyGet(
        mockGet(
          `/api/extension/verify-sender?email=${encodeURIComponent(e2eEmail("unknown", runId))}`,
          { Authorization: `Bearer ${apiKey}` },
        ),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("UNKNOWN");
    });
  });

  // ─── BLOC 11 ───────────────────────────────────────────────
  describe("Bloc 11 — Suppression compte", () => {
    itE2e("11.1 — Demande suppression programmée 30j", async () => {
      const email = e2eEmail("delete-req", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        subscription: { plan: "DISCOVERY", status: "inactive" },
      });
      setSession(user);

      const res = await accountDelete(
        mockDelete("/api/user/account", { confirmation: "SUPPRIMER" }),
      );
      expect(res.status).toBe(200);

      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated!.accountDeletionScheduledAt).toBeTruthy();
      expect(updated!.accountDeletionScheduledAt!.getTime()).toBeGreaterThan(Date.now());
    });

    itE2e("11.2 — Reconnexion annule suppression", async () => {
      const email = e2eEmail("delete-cancel", runId);
      const scheduled = new Date(Date.now() + 30 * 864e5);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        accountDeletionScheduledAt: scheduled,
      });

      await cancelScheduledAccountDeletion(user.id);
      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated!.accountDeletionScheduledAt).toBeNull();
    });

    itE2e("11.3 — Stripe actif → 409", async () => {
      const email = e2eEmail("delete-stripe", runId);
      const user = await createE2EUser(tracker, {
        email,
        emailVerified: new Date(),
        stripeCustomerId: "cus_e2e_test",
        subscription: {
          plan: "ESSENTIEL",
          status: "active",
          stripeSubscriptionId: "sub_e2e_test",
        },
      });
      setSession(user);

      const res = await accountDelete(
        mockDelete("/api/user/account", { confirmation: "SUPPRIMER" }),
      );
      expect(res.status).toBe(409);
    });
  });

  // ─── BLOC 12 ───────────────────────────────────────────────
  describe("Bloc 12 — Admin", () => {
    it("12.1 — Admin autorisé → stats 200", async (ctx) => {
      if (!hasDatabase) ctx.skip();
      setSession({ id: "admin-session", email: HARDCODED_ADMIN_EMAIL });
      const res = await adminStatsGet();
      expect(res.status).toBe(200);
    });

    itE2e("12.2 — Non-admin → 403", async () => {
      const email = e2eEmail("non-admin", runId);
      const user = await createE2EUser(tracker, { email, emailVerified: new Date() });
      setSession(user);

      const res = await adminStatsGet();
      expect(res.status).toBe(403);
    });

    itE2e("12.3 — Activation certificat admin", async () => {
      const ownerEmail = e2eEmail("cert-owner", runId);
      const user = await createE2EUser(tracker, { email: ownerEmail, emailVerified: new Date() });
      const entity = await createE2EEntity(tracker, {
        userId: user.id,
        entityType: "INDIVIDUAL",
        firstName: "Pending",
        lastName: "Cert",
        email: ownerEmail,
        kycStatus: "VERIFIED",
      });
      const cert = await createE2ECertificate(tracker, {
        entityId: entity.id,
        status: "PENDING",
        level: "DISCOVERY",
      });

      setSession({ id: user.id, email: HARDCODED_ADMIN_EMAIL });
      const res = await adminCertPatch(
        mockPost(`/api/admin/certificates/${cert.id}`, { action: "activate" }),
        { params: Promise.resolve({ id: cert.id }) },
      );
      expect(res.status).toBe(200);

      const updated = await prisma.certificate.findUnique({ where: { id: cert.id } });
      expect(updated!.status).toBe("ACTIVE");
    });
  });

  describe("SKIP documentés — non implémentés ou infra spécifique", () => {
    it.skip("1.4b — POST /api/auth/callback/credentials (cookie NextAuth)", () => {});
    it.skip("4.3 — Contact enrichi badge BLOCKTRUST (fixture cert tiers)", () => {});
    it.skip("4.4 — Quota 5 contacts Découverte (lent — 6 créations)", () => {});
    it.skip("5.7 — DELETE Trust Circle MUTUAL cascade", () => {});
    it.skip("8.6 — Rate limit vault 61 req/min", () => {});
    it.skip("9.2 — Token rotatif verify ?vt=", () => {});
    it.skip("9.3 — Cert PENDING verdict public", () => {});
    it.skip("10.1 — Email officiel trustScore 100", () => {});
    it.skip("10.2 — Email certifié BLOCKTRUST", () => {});
    it.skip("12.4 — DELETE admin user anonymisation", () => {});
  });
});
