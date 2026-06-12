// lib/internal-team.ts
// Équipe BLOCKTRUST — statut connexion (super admin uniquement)
// ============================================================

import { prisma } from '@/app/lib/db'
import {
  getAllInternalEmails,
  isDashboardAdmin,
} from '@/lib/admin-utils'

export const ONLINE_THRESHOLD_MS = 15 * 60 * 1000

export type InternalTeamRole = 'Admin' | 'Interne'

export type InternalTeamMemberRow = {
  email: string
  role: InternalTeamRole
  lastLoginAt: Date | null
  createdAt: Date
  status: 'En ligne' | 'Hors ligne'
  registered: boolean
}

export function getInternalTeamRole(email: string): InternalTeamRole {
  return isDashboardAdmin(email) ? 'Admin' : 'Interne'
}

export function getConnectionStatus(
  lastLoginAt: Date | null,
  nowMs: number = Date.now(),
): 'En ligne' | 'Hors ligne' {
  if (!lastLoginAt) return 'Hors ligne'
  return nowMs - lastLoginAt.getTime() < ONLINE_THRESHOLD_MS ? 'En ligne' : 'Hors ligne'
}

/** Liste tous les comptes internes (inscrits ou emails canoniques sans compte). */
export async function fetchInternalTeamMembers(): Promise<InternalTeamMemberRow[]> {
  const emails = getAllInternalEmails()
  const users = await prisma.user.findMany({
    where: {
      OR: emails.map((e) => ({
        email: { equals: e, mode: 'insensitive' as const },
      })),
    },
    select: {
      email: true,
      lastLoginAt: true,
      createdAt: true,
    },
  })

  const byEmail = new Map(
    users
      .filter((u): u is typeof u & { email: string } => Boolean(u.email))
      .map((u) => [u.email.toLowerCase(), u]),
  )

  const nowMs = Date.now()

  return emails.map((canonical) => {
    const row = byEmail.get(canonical.toLowerCase())
    const email = row?.email ?? canonical
    const lastLoginAt = row?.lastLoginAt ?? null
    const createdAt = row?.createdAt ?? null

    return {
      email,
      role: getInternalTeamRole(email),
      lastLoginAt,
      createdAt: createdAt ?? new Date(0),
      status: getConnectionStatus(lastLoginAt, nowMs),
      registered: Boolean(row),
    }
  })
}
