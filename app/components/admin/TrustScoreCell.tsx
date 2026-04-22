// app/components/admin/TrustScoreCell.tsx
// Affiche un TrustScore (0-100) avec couleur dynamique + label.
// ============================================================

export function trustScoreColorClass(score: number): string {
  if (score >= 80) return 'text-bt-cyan'
  if (score >= 50) return 'text-gold'
  if (score >= 25) return 'text-amber-400'
  return 'text-white/40'
}

export default function TrustScoreCell({
  score,
  level,
}: {
  score: number | null | undefined
  level?: string | null
}) {
  if (score === null || score === undefined) {
    return <span className="font-mono text-xs text-white/30">—</span>
  }
  const colorClass = trustScoreColorClass(score)
  return (
    <div className="flex flex-col">
      <span className={`font-mono text-sm ${colorClass}`}>
        {score}
        <span className="text-white/30">/100</span>
      </span>
      {level && (
        <span className="font-sans text-[10px] uppercase tracking-wider text-white/40">
          {level}
        </span>
      )}
    </div>
  )
}
