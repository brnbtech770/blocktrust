// app/dashboard/loading.tsx
// Fallback Suspense : skeleton complet du dashboard
// ============================================================

import DashboardLayout from '@/app/components/dashboard/DashboardLayout'
import KpiGridSkeleton from '@/app/components/dashboard/KpiGridSkeleton'
import CertificateTableSkeleton from '@/app/components/dashboard/CertificateTableSkeleton'
import ActivityFeedSkeleton from '@/app/components/dashboard/ActivityFeedSkeleton'

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="h-9 w-48 bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-700/80 rounded animate-pulse" />
      </div>
      <KpiGridSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <CertificateTableSkeleton />
        </div>
        <div>
          <ActivityFeedSkeleton />
        </div>
      </div>
    </DashboardLayout>
  )
}
