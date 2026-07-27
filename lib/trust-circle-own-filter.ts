// lib/trust-circle-own-filter.ts
// Exclut les propres badges/emails du Trust Circle affiché
// ============================================================

import { normalizeEntityEmail } from '@/lib/entity-contacts'

type TrustCircleUserRef = {
  id: string
  email: string | null
}

type TrustCircleRelationRow = {
  toUserId: string | null
  toEmail: string | null
  toUser?: TrustCircleUserRef | null
}

export function buildOwnEmailSet(
  sessionEmail: string | null | undefined,
  entityEmails: Array<string | null | undefined>,
): Set<string> {
  const own = new Set<string>()
  if (sessionEmail?.trim()) {
    own.add(normalizeEntityEmail(sessionEmail))
  }
  for (const email of entityEmails) {
    if (email?.trim()) {
      own.add(normalizeEntityEmail(email))
    }
  }
  return own
}

export function isOwnTrustCircleRelation(
  relation: TrustCircleRelationRow,
  userId: string,
  ownEmails: Set<string>,
): boolean {
  if (relation.toUserId === userId) return true
  if (relation.toUser?.id === userId) return true

  const toEmail = relation.toEmail?.trim()
  if (toEmail && ownEmails.has(normalizeEntityEmail(toEmail))) {
    return true
  }

  const toUserEmail = relation.toUser?.email?.trim()
  if (toUserEmail && ownEmails.has(normalizeEntityEmail(toUserEmail))) {
    return true
  }

  return false
}

export function filterOwnTrustCircleRelations<T extends TrustCircleRelationRow>(
  relations: T[],
  userId: string,
  ownEmails: Set<string>,
): T[] {
  return relations.filter((r) => !isOwnTrustCircleRelation(r, userId, ownEmails))
}
