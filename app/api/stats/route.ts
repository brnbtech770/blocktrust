import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { getDashboardStats } from '@/lib/dashboard-stats'
import type { DashboardStats } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse<DashboardStats | { error: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const stats = await getDashboardStats(session.user.id, session.user.email)
    return NextResponse.json(stats)
  } catch (e) {
    console.error('[API stats]', e)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des statistiques' },
      { status: 500 },
    )
  }
}
