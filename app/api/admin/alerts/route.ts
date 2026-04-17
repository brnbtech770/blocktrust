// app/api/admin/alerts/route.ts
// GET liste des alertes admin ; PATCH marquer toutes comme lues
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const where = type && type !== 'ALL' ? { type } : {}

    const alerts = await prisma.adminAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({
      alerts: alerts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error('Admin alerts GET', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const patchSchema = z.object({
  markAllRead: z.literal(true),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
    }

    await prisma.adminAlert.updateMany({
      where: { read: false },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Admin alerts PATCH', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
