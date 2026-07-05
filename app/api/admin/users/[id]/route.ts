// app/api/admin/users/[id]/route.ts
// Suppression définitive d'un utilisateur par un admin dashboard
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/app/lib/auth-server'
import { isDashboardAdmin } from '@/lib/admin-utils'
import { prisma } from '@/app/lib/db'
import { deleteAccountAsAdmin } from '@/lib/admin-delete-account'
import { isValidAdminPlanCode, updateUserPlanAdmin } from '@/lib/admin-update-user-plan'

interface RouteParams {
  params: Promise<{ id: string }>
}

const deleteBodySchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
    confirmEmail: z.string().trim().email(),
    cancelStripe: z.boolean().optional(),
  })
  .strict()

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email || !isDashboardAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: targetUserId } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
    }

    const parsed = deleteBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Raison et email de confirmation requis.' },
        { status: 400 },
      )
    }

    const result = await deleteAccountAsAdmin({
      targetUserId,
      adminUserId: session.user.id,
      adminEmail: session.user.email,
      reason: parsed.data.reason,
      confirmEmail: parsed.data.confirmEmail,
      cancelStripe: parsed.data.cancelStripe,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
          requiresStripeCancellation: result.requiresStripeCancellation,
        },
        { status: result.status },
      )
    }

    return NextResponse.json({ success: true, deletedUserId: targetUserId })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }
    console.error('Admin user DELETE', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isDashboardAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: targetUserId } = await params
    const body = await req.json().catch(() => null)
    const plan = typeof body?.plan === 'string' ? body.plan.trim().toUpperCase() : ''

    if (!isValidAdminPlanCode(plan)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    await updateUserPlanAdmin(targetUserId, plan)

    return NextResponse.json({ success: true, plan })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur serveur'
    console.error('[admin/users PATCH]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
