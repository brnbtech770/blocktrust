// app/components/dashboard/BlockchainTicker.tsx
// Bandeau animé type ticker blockchain (hash statique en attendant Polygon)
// ============================================================

'use client'

const STATIC_HASH =
  '0x7a3f...9e2b • Polygon • Dernier bloc: 52,847,291 • BlockTrust Anchor Pending'

export default function BlockchainTicker() {
  return (
    <div
      className="relative overflow-hidden border-y border-[var(--bt-gold)]/30 bg-[var(--bt-navy)]/80 py-2"
      aria-label="Statut blockchain"
    >
      <div className="bt-ticker-track flex w-max items-center gap-8">
        <span className="font-mono text-xs text-[var(--bt-gold)]/90 whitespace-nowrap">
          {STATIC_HASH}
        </span>
        <span className="font-mono text-xs text-[var(--bt-gold)]/90 whitespace-nowrap">
          {STATIC_HASH}
        </span>
        <span className="font-mono text-xs text-[var(--bt-gold)]/90 whitespace-nowrap">
          {STATIC_HASH}
        </span>
      </div>
    </div>
  )
}
