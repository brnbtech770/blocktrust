// app/api/admin/users/[id]/route.ts
// Suppression définitive d’un utilisateur (non admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { deleteAdminUserTransaction } from '@/lib/admin-delete-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (!isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 })
    }

    const { id: targetUserId } = await params

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (
      target.email &&
      session.user.email &&
      target.email.toLowerCase() === session.user.email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte depuis l’admin.' },
        { status: 400 }
      )
    }

    if (isAdmin(target.email)) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un compte administrateur.' },
        { status: 403 }
      )
    }

    await prisma.$transaction((tx) => deleteAdminUserTransaction(targetUserId, tx))

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
