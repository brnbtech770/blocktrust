// app/api/admin/ai-alerts/[id]/route.ts
// Mise à jour du statut d'une alerte IA (investigation / résolution / ignore)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/lib/admin-utils'
import { prisma } from '@/app/lib/db'

const patchSchema = z
  .object({
    status: z.enum(['INVESTIGATING', 'RESOLVED', 'IGNORED']),
  })
  .strict()

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const dbStatus = parsed.data.status === 'IGNORED' ? 'DISMISSED' : parsed.data.status
    const now = new Date()

    await prisma.aIAlert.update({
      where: { id },
      data: {
        status: dbStatus,
        ...(dbStatus === 'RESOLVED' || dbStatus === 'DISMISSED'
          ? { resolvedAt: now, resolvedBy: session.user.email }
          : {}),
        ...(dbStatus === 'INVESTIGATING' ? { resolvedAt: null, resolvedBy: null } : {}),
      },
    })

    return NextResponse.json({ success: true, status: dbStatus })
  } catch (e) {
    console.error('[admin/ai-alerts PATCH]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
