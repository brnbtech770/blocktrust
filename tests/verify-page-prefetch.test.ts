import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  certificate: { findFirst: vi.fn() },
  user: { findUnique: vi.fn() },
}));

const authMock = vi.hoisted(() => vi.fn());

vi.mock("@/app/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/app/lib/auth-server", () => ({ auth: authMock }));
vi.mock("@/lib/trust-engine-cache", () => ({
  getTrustEngineResultForApi: vi.fn().mockResolvedValue(null),
}));

import { prefetchVerifyCertPayload } from "@/lib/verify-page-prefetch";

function unreachableError() {
  return Object.assign(
    new Error(
      "Can't reach database server at `ep-bold-frost-agajqrnv-pooler.c-2.eu-central-1.aws.neon.tech:5432`",
    ),
    { name: "PrismaClientInitializationError" },
  );
}

describe("prefetchVerifyCertPayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
  });

  it("Neon injoignable → ERROR, jamais FRAUD", async () => {
    prismaMock.certificate.findFirst.mockRejectedValue(unreachableError());

    const data = await prefetchVerifyCertPayload("bt-valid-cert-001", {
      attempts: 2,
      delayMs: 0,
    });

    expect(data?.verdict).toBe("ERROR");
    expect(data?.error).toBe("service_unavailable");
    expect(data?.reason).toBe("database_unreachable");
  });

  it("certificat introuvable (DB OK) → FRAUD métier inchangé", async () => {
    prismaMock.certificate.findFirst.mockResolvedValue(null);

    const data = await prefetchVerifyCertPayload("inexistant");

    expect(data?.verdict).toBe("FRAUD");
    expect(data?.reason).toBe("certificate_not_found");
  });
});
