// app/api/admin/alerts/[id]/read/route.ts
// Marquer une alerte comme lue
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    await prisma.adminAlert.update({
      where: { id },
      data: { read: true },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Admin alert read PATCH', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
