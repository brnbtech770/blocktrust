// app/components/dashboard/CertificateTableSkeleton.tsx
// Skeleton pour CertificateTable (Suspense fallback)
// ============================================================

'use client'

export default function CertificateTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="flex gap-4 border-b border-white/10 px-4 py-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 bg-gray-700 rounded w-24 animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-gray-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 flex gap-4 items-center">
            <div className="h-4 bg-gray-700 rounded w-32 animate-pulse" />
            <div className="h-5 bg-gray-700 rounded w-20 animate-pulse" />
            <div className="h-4 bg-gray-700 rounded w-12 animate-pulse" />
            <div className="h-4 bg-gray-700 rounded w-24 animate-pulse" />
            <div className="h-8 bg-gray-700 rounded w-24 animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
