// app/api/admin/users/bulk-delete/route.ts
// Suppression en masse (admin, non-admins cibles)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin, isInternalAccount } from '@/lib/admin-utils'
import { prisma } from '@/app/lib/db'
import { deleteUserAdmin } from '@/lib/admin-delete-user'
import { z } from 'zod'

const bodySchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(100),
  })
  .strict()

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
    }

    const deleted: string[] = []
    const errors: string[] = []

    for (const targetUserId of parsed.data.ids) {
      const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true },
      })
      if (!target) {
        errors.push(`${targetUserId}: introuvable`)
        continue
      }
      if (
        target.email &&
        session.user.email &&
        target.email.toLowerCase() === session.user.email.toLowerCase()
      ) {
        errors.push(`${target.email}: impossible de supprimer votre compte`)
        continue
      }
      if (isInternalAccount(target.email)) {
        errors.push(`${target.email}: compte interne`)
        continue
      }
      try {
        await deleteUserAdmin(target.id)
        deleted.push(target.id)
      } catch {
        errors.push(`${target.email ?? target.id}: erreur`)
      }
    }

    return NextResponse.json({
      success: true,
      deletedIds: deleted,
      errors,
    })
  } catch (e) {
    console.error('bulk-delete', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
