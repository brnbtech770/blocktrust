// app/api/admin/users/bulk-delete/route.ts
// Suppression en masse (admin dashboard)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isDashboardAdmin, isSuperAdmin } from '@/lib/admin-utils'
import { prisma } from '@/app/lib/db'
import { deleteAccountAsAdmin } from '@/lib/admin-delete-account'
import { z } from 'zod'

const bodySchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(100),
    reason: z.string().trim().min(3).max(500),
    cancelStripe: z.boolean().optional(),
  })
  .strict()

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email || !isDashboardAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const json = await req.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Corps invalide (ids + reason requis)' }, { status: 400 })
    }

    const deleted: string[] = []
    const errors: string[] = []

    for (const targetUserId of parsed.data.ids) {
      const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, email: true },
      })
      if (!target?.email) {
        errors.push(`${targetUserId}: introuvable`)
        continue
      }
      if (target.email.toLowerCase() === session.user.email!.toLowerCase()) {
        errors.push(`${target.email}: impossible de supprimer votre compte`)
        continue
      }
      if (isDashboardAdmin(target.email) && !isSuperAdmin(session.user.email)) {
        errors.push(`${target.email}: compte administrateur protégé`)
        continue
      }

      const result = await deleteAccountAsAdmin({
        targetUserId: target.id,
        adminUserId: session.user.id,
        adminEmail: session.user.email,
        reason: parsed.data.reason,
        confirmEmail: target.email,
        cancelStripe: parsed.data.cancelStripe,
      })

      if (!result.ok) {
        errors.push(`${target.email}: ${result.error}`)
        continue
      }

      deleted.push(target.id)
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
