// app/components/dashboard/BlockchainTicker.tsx
// Bandeau animé : réseau d'ancrage Polygon — aucune donnée de transaction factice.
// ============================================================

'use client'

// Message FACTUEL uniquement (réseau réel). Jamais de hash / numéro de bloc inventé :
// l'état d'ancrage réel d'un certificat est affiché sur sa page de détail.
const TICKER_LABEL =
  'Polygon Mainnet · Chain ID 137 · Ancrage on-chain des certificats BLOCKTRUST'

export default function BlockchainTicker() {
  return (
    <div
      className="relative overflow-x-hidden border-t py-1.5 sm:py-2"
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
          <span key={i} className="inline-flex whitespace-nowrap font-mono text-[10px] sm:text-xs">
            <span style={{ color: '#00d4ff' }}>BLOCKCHAIN · </span>
            <span style={{ color: 'rgba(0,212,255,0.35)' }}>{TICKER_LABEL}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
