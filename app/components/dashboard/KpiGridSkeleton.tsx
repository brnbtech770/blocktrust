// app/components/dashboard/KpiGridSkeleton.tsx
// Skeleton pour KpiGrid (Suspense fallback)
// ============================================================

'use client'

export default function KpiGridSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:mb-8 lg:grid-cols-3 xl:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
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
