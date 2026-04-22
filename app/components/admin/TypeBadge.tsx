// app/components/admin/TypeBadge.tsx
// Badge B2B / B2C pour les tableaux admin.
// ============================================================

export default function TypeBadge({
  variant,
  className = '',
}: {
  variant: 'B2B' | 'B2C'
  className?: string
}) {
  const isB2B = variant === 'B2B'
  const tone = isB2B
    ? 'bg-gold/15 text-gold border-gold/30'
    : 'bg-white/10 text-white/60 border-white/20'
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] tracking-widest ${tone} ${className}`.trim()}
    >
      {variant}
    </span>
  )
}
