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

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [activeCerts, verifications7d, fraudAlertsCount, userChainCerts] = await Promise.all([
      prisma.certificate.count({
        where: {
          entity: { userId },
          status: { in: ['ACTIVE', 'ANCHORED'] },
        },
      }),
      prisma.verification.count({
        where: {
          certificate: { entity: { userId } },
          verifiedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.adminAlert.count({
        where: {
          userId,
          read: false,
          type: {
            in: ['FRAUD_ALERT', 'SUSPICIOUS_VOLUME', 'SUSPICIOUS_SCANNING'],
          },
        },
      }),
      prisma.certificate.findMany({
        where: { entity: { userId } },
        select: {
          blockchainStatus: true,
          polygonTxHash: true,
          txHash: true,
          polygonExplorerUrl: true,
          polygonAnchoredAt: true,
        },
      }),
    ])

    const isAnchoredOnChain = (c: (typeof userChainCerts)[number]) =>
      c.blockchainStatus === 'ANCHORED' || Boolean(c.polygonTxHash || c.txHash)

    let blockchainStatus: DashboardStats['blockchainStatus'] = 'pending'
    let polygonExplorerUrl: string | null = null

    if (userChainCerts.length === 0) {
      blockchainStatus = 'pending'
    } else {
      const anyAnchored = userChainCerts.some(isAnchoredOnChain)
      const allFailed =
        userChainCerts.length > 0 &&
        userChainCerts.every((c) => c.blockchainStatus === 'FAILED' && !isAnchoredOnChain(c))

      if (anyAnchored) {
        blockchainStatus = 'connected'
        const withLink = [...userChainCerts]
          .filter((c) => isAnchoredOnChain(c) && c.polygonExplorerUrl)
          .sort(
            (a, b) =>
              (b.polygonAnchoredAt?.getTime() ?? 0) - (a.polygonAnchoredAt?.getTime() ?? 0)
          )
        polygonExplorerUrl = withLink[0]?.polygonExplorerUrl ?? null
      } else if (allFailed) {
        blockchainStatus = 'unavailable'
      } else {
        blockchainStatus = 'pending'
      }
    }

    return NextResponse.json({
      activeCerts,
      verifications7d,
      blockchainStatus,
      fraudAlerts: fraudAlertsCount,
      polygonExplorerUrl,
    })
  } catch (e) {
    console.error('[API stats]', e)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des statistiques' },
      { status: 500 }
    )
  }
}
