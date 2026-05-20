// app/api/admin/stats/route.ts
// API admin pour les KPIs
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification et les droits admin
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculer les KPIs
    const [
      pendingCertificates,
      activeUsers,
      totalUsers,
      activeCertificates,
      totalCertificates,
      suspendedCertificates,
      revokedCertificates,
    ] = await Promise.all([
      prisma.certificate.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { planId: { not: null } } }),
      prisma.user.count(),
      prisma.certificate.count({ where: { status: 'ACTIVE' } }),
      prisma.certificate.count(),
      prisma.certificate.count({ where: { status: 'SUSPENDED' } }),
      prisma.certificate.count({ where: { status: 'REVOKED' } }),
    ])

    return NextResponse.json({
      stats: {
        pendingCertificates,
        activeUsers,
        totalUsers,
        activeCertificates,
        totalCertificates,
        suspendedCertificates,
        revokedCertificates,
      },
    })
  } catch (error: unknown) {
    console.error('❌ Admin stats error:', error)
    const message = error instanceof Error ? error.message : undefined
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des statistiques',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    )
  }
}
