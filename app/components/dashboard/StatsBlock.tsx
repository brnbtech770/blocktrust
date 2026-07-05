// app/components/dashboard/StatsBlock.tsx
// Affiche les KPIs passés en props depuis dashboard/page.tsx (RSC).
// ============================================================

import type { DashboardStats } from '@/types/dashboard'
import KpiGrid from './KpiGrid'

export default function StatsBlock({
  stats,
  contactsSub,
}: {
  stats: DashboardStats
  contactsSub?: string
}) {
  return (
    <KpiGrid
      certs={stats.activeCerts}
      contacts={stats.contacts}
      contactsSub={contactsSub}
      verifications={stats.verifications7d}
      blockchainStatus={stats.blockchainStatus}
      fraudAlerts={stats.fraudAlerts}
      polygonExplorerUrl={stats.polygonExplorerUrl}
    />
  )
}
