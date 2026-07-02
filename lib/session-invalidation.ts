// lib/session-invalidation.ts
// Invalidation sessions + JWT (sessionVersion)
// ============================================================

import { prisma } from "@/app/lib/db";
import { writeSecurityAuditLogFireAndForget } from "@/lib/security-audit";

export async function bumpSessionVersion(userId: string): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return updated.sessionVersion;
}

export async function invalidateUserSessions(
  userId: string,
  options?: {
    keepCurrentSessionToken?: string | null;
    auditAction?: string;
    ip?: string | null;
  },
): Promise<number> {
  if (options?.keepCurrentSessionToken) {
    await prisma.session.deleteMany({
      where: {
        userId,
        NOT: { sessionToken: options.keepCurrentSessionToken },
      },
    });
  } else {
    await prisma.session.deleteMany({ where: { userId } });
  }

  const version = await bumpSessionVersion(userId);

  if (options?.auditAction) {
    writeSecurityAuditLogFireAndForget({
      action: options.auditAction,
      userId,
      resource: "user",
      resourceId: userId,
      ip: options.ip,
      metadata: { sessionVersion: version },
    });
  }

  return version;
}
