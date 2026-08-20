import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  entity: {
    findFirst: vi.fn(),
  },
}));

vi.mock("@/app/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/app/lib/auth", () => ({ hashIp: vi.fn().mockReturnValue("ip-hash") }));
vi.mock("@/lib/rate-limit-register", () => ({
  checkRateLimitRegisterAsync: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("@/lib/admin-alerts", () => ({ createAdminAlert: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/welcome-email", () => ({
  sendWelcomeEmailIfNeeded: vi.fn(),
  resolveWelcomeFirstName: vi.fn().mockReturnValue("Jean"),
}));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileForRegister: vi.fn().mockResolvedValue({
    ok: true,
    skipped: true,
    reason: "client_bypass",
  }),
}));
vi.mock("@/lib/login-lockout", () => ({
  clearLoginLockout: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/email-verification", () => ({
  sendVerificationEmailForUser: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("@/lib/email-utils", () => ({
  normalizeEmail: vi.fn((email: string) => email.trim().toLowerCase()),
  findUserByNormalizedEmail: vi.fn().mockResolvedValue(null),
}));

import { POST as registerPost } from "@/app/api/auth/register/route";
import { clearLoginLockout } from "@/lib/login-lockout";
import { findUserByNormalizedEmail } from "@/lib/email-utils";

function registerRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  firstName: "Jean",
  lastName: "Dupont",
  email: "user@example.com",
  password: "SecurePass1!",
  acceptCgu: true,
  website: "",
  formLoadedAt: Date.now() - 5000,
  turnstileBypass: true,
};

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.entity.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "user-new-1",
      email: "user@example.com",
      name: "Jean Dupont",
    });
  });

  it("crée un user avec password hashé et sessionVersion=0", async () => {
    const res = await registerPost(registerRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.userId).toBe("user-new-1");
    expect(clearLoginLockout).toHaveBeenCalledWith("user@example.com");
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "user@example.com",
          sessionVersion: 0,
          password: expect.stringMatching(/^\$2[ab]\$/),
        }),
      }),
    );
  });

  it("retourne 400 générique si l'email User existe déjà (anti-énumération)", async () => {
    vi.mocked(findUserByNormalizedEmail).mockResolvedValueOnce({
      id: "existing-1",
      email: "user@example.com",
    });

    const res = await registerPost(registerRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Une erreur est survenue. Vérifiez vos informations.");
    expect(data.error).not.toContain("déjà utilisé");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("retourne 400 si le mot de passe ne respecte pas la politique", async () => {
    const res = await registerPost(
      registerRequest({
        ...validBody,
        password: "short",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeTruthy();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("retourne 400 si le nom semble généré par un bot", async () => {
    const res = await registerPost(
      registerRequest({
        ...validBody,
        firstName: "Ccyo",
        lastName: "Rfxdifwx",
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Veuillez saisir un nom valide");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});
