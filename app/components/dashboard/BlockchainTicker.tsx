// app/components/dashboard/BlockchainTicker.tsx
// Bandeau animé type ticker blockchain (hash statique en attendant Polygon)
// ============================================================

'use client'

const STATIC_HASH =
  '0x7a3f...9e2b • Polygon • Dernier bloc: 52,847,291 • BlockTrust Anchor Pending'

export default function BlockchainTicker() {
  return (
    <div
      className="relative overflow-hidden border-t py-2"
      style={{
        background: 'rgba(0,0,0,0.5)',
        borderTopColor: 'var(--bt-border)',
      }}
      aria-label="Statut blockchain"
    >
      <div
        className="flex w-max items-center gap-8"
        style={{ animation: 'bt-ticker 20s linear infinite' }}
      >
        {[1, 2].map((i) => (
          <span key={i} className="font-mono text-xs whitespace-nowrap inline-flex">
            <span style={{ color: '#00d4ff' }}>BLOCKCHAIN · </span>
            <span style={{ color: 'rgba(0,212,255,0.35)' }}>{STATIC_HASH}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
