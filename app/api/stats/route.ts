// app/api/stats/route.ts
// GET /api/stats — KPIs dashboard (certificats actifs, vérifs 7j, blockchain, alertes fraude)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import type { DashboardStats } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse<DashboardStats | { error: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userId = session.user.id

    const [activeCerts, verifications7d, fraudAlertsCount] = await Promise.all([
      prisma.certificate.count({
        where: {
          entity: { userId },
          status: { in: ['ACTIVE', 'ANCHORED'] },
        },
      }),
      (() => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return prisma.verification.count({
          where: {
            certificate: { entity: { userId } },
            verifiedAt: { gte: sevenDaysAgo },
          },
        })
      })(),
      prisma.adminAlert.count({
        where: {
          userId,
          read: false,
          type: {
            in: ['FRAUD_ALERT', 'SUSPICIOUS_VOLUME', 'SUSPICIOUS_SCANNING'],
          },
        },
      }),
    ])

    const blockchainStatus: DashboardStats['blockchainStatus'] = 'pending'

    return NextResponse.json({
      activeCerts,
      verifications7d,
      blockchainStatus,
      fraudAlerts: fraudAlertsCount,
    })
  } catch (e) {
    console.error('[API stats]', e)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des statistiques' },
      { status: 500 }
    )
  }
}
