// app/pricing/loading.tsx
// Skeleton de chargement — même grid que la page (1 → 2 → 4 colonnes)
// ============================================================

export default function PricingLoading() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#001a33' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12 animate-pulse">
          <div className="h-10 bg-white/10 rounded w-3/4 max-w-md mx-auto mb-4" />
          <div className="h-5 bg-white/10 rounded w-full max-w-xl mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-96 rounded-xl animate-pulse"
              style={{
                backgroundColor: 'rgba(0,34,68,0.85)',
                border: '1px solid rgba(189,167,107,0.2)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
