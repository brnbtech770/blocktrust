// app/api/admin/users/route.ts
// API admin pour lister tous les utilisateurs
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { adminUserListSelect } from '@/lib/prisma-admin-user'

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification et les droits admin
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: adminUserListSelect,
      orderBy: { createdAt: 'desc' },
    })

    // Formater les données
    const formatted = users.map((user) => {
      const totalCertificates = user.entities.reduce(
        (sum, entity) => sum + entity._count.certificates,
        0
      )

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan
          ? {
              id: user.plan.id,
              name: user.plan.name,
              type: user.plan.type,
            }
          : null,
        entitiesCount: user.entities.length,
        certificatesCount: totalCertificates,
        createdAt: user.createdAt.toISOString(),
      }
    })

    return NextResponse.json({ users: formatted })
  } catch (error: any) {
    console.error('❌ Admin users list error:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des utilisateurs',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}
