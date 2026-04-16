// app/components/dashboard/KpiGridSkeleton.tsx
// Skeleton pour KpiGrid (Suspense fallback)
// ============================================================

'use client'

export default function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-5"
        >
          <div className="h-4 w-24 bg-gray-700 rounded mb-3" />
          <div className="h-8 w-16 bg-gray-700 rounded mb-2" />
          <div className="h-3 w-20 bg-gray-700/80 rounded" />
        </div>
      ))}
    </div>
  )
}
