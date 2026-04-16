// app/components/dashboard/ActivityFeedSkeleton.tsx
// Skeleton pour ActivityFeed (Suspense fallback)
// ============================================================

'use client'

export default function ActivityFeedSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="h-5 w-40 bg-gray-700 rounded animate-pulse" />
      </div>
      <ul className="divide-y divide-gray-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="w-4 h-4 bg-gray-700 rounded animate-pulse shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-3 bg-gray-700/80 rounded w-1/2 animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
