// lib/trust-circle-invites.ts
// Rattachement invitations Trust Circle (toEmail → toUserId)
// ============================================================

import { prisma } from "@/app/lib/db";

export function normalizeTrustEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Filtre Prisma : invitations reçues par userId ou email en attente de rattachement. */
export function pendingReceivedInviteWhere(userId: string, email: string | null | undefined) {
  const emailNorm = email?.trim().toLowerCase();
  const or: Array<
    | { toUserId: string }
    | { toUserId: null; toEmail: { equals: string; mode: "insensitive" } }
  > = [{ toUserId: userId }];
  if (emailNorm) {
    or.push({ toUserId: null, toEmail: { equals: emailNorm, mode: "insensitive" } });
  }
  return {
    status: "PENDING" as const,
    isMutual: false,
    OR: or,
  };
}

export async function linkPendingInvitesToUser(userId: string, email: string): Promise<number> {
  const emailNorm = normalizeTrustEmail(email);
  const result = await prisma.userTrustRelation.updateMany({
    where: {
      toUserId: null,
      toEmail: { equals: emailNorm, mode: "insensitive" },
      status: "PENDING",
    },
    data: { toUserId: userId },
  });
  return result.count;
}

export function userCanAcceptInvite(
  relation: { toUserId: string | null; toEmail: string | null },
  userId: string,
  userEmail: string | null | undefined,
): boolean {
  if (relation.toUserId === userId) return true;
  const emailNorm = userEmail?.trim().toLowerCase();
  if (!emailNorm || relation.toUserId !== null) return false;
  return normalizeTrustEmail(relation.toEmail ?? "") === emailNorm;
}
