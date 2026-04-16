// app/dashboard/loading.tsx
// Fallback Suspense : skeleton complet du dashboard
// ============================================================

import KpiGridSkeleton from '@/app/components/dashboard/KpiGridSkeleton'
import CertificateTableSkeleton from '@/app/components/dashboard/CertificateTableSkeleton'
import ActivityFeedSkeleton from '@/app/components/dashboard/ActivityFeedSkeleton'

export default function DashboardLoading() {
  return (
    <>
      <div className="mb-8">
        <div className="mb-2 h-9 max-w-xs animate-pulse rounded bg-gray-700" />
        <div className="h-4 max-w-md animate-pulse rounded bg-gray-700/80" />
      </div>
      <KpiGridSkeleton />
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CertificateTableSkeleton />
        </div>
        <div>
          <ActivityFeedSkeleton />
        </div>
      </div>
    </>
  )
}
