// app/api/admin/users/route.ts
// API admin pour lister tous les utilisateurs
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { adminUserListSelect } from '@/lib/prisma-admin-user'
import { randomBytes } from 'crypto'

export async function GET() {
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
  } catch (error: unknown) {
    console.error('❌ Admin users list error:', error)
    const message = error instanceof Error ? error.message : undefined
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des utilisateurs',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    if (body?.test !== true) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }

    const suffix = randomBytes(4).toString('hex')
    const email = `test+${suffix}@blocktrust.test`
    const name = `Utilisateur test ${suffix}`

    const user = await prisma.user.create({
      data: {
        email,
        name,
        emailVerified: new Date(),
        accountType: 'PERSONAL',
      },
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    console.error('[admin/users POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
