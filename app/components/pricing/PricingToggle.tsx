'use client'

type Mode = 'B2C' | 'B2B'

type Props = {
  mode: Mode
  setMode: (m: Mode) => void
}

export default function PricingToggle({ mode, setMode }: Props) {
  return (
    <div
      className="flex rounded-[10px] p-1 gap-1 w-fit mx-auto mb-10"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid var(--bt-border)',
      }}
    >
      <button
        type="button"
        onClick={() => setMode('B2B')}
        className="flex items-center gap-2 rounded-lg py-2.5 px-6 font-semibold transition"
        style={
          mode === 'B2B'
            ? { background: '#00d4ff', color: '#0a1628' }
            : { background: 'transparent', color: 'var(--bt-muted)' }
        }
        onMouseEnter={(e) => {
          if (mode !== 'B2B') {
            e.currentTarget.style.color = 'white'
          }
        }}
        onMouseLeave={(e) => {
          if (mode !== 'B2B') {
            e.currentTarget.style.color = 'var(--bt-muted)'
          }
        }}
      >
        <BuildingIcon className="w-4 h-4" />
        Entreprises
      </button>
      <button
        type="button"
        onClick={() => setMode('B2C')}
        className="flex items-center gap-2 rounded-lg py-2.5 px-6 font-semibold transition"
        style={
          mode === 'B2C'
            ? { background: '#00d4ff', color: '#0a1628' }
            : { background: 'transparent', color: 'var(--bt-muted)' }
        }
        onMouseEnter={(e) => {
          if (mode !== 'B2C') {
            e.currentTarget.style.color = 'white'
          }
        }}
        onMouseLeave={(e) => {
          if (mode !== 'B2C') {
            e.currentTarget.style.color = 'var(--bt-muted)'
          }
        }}
      >
        <PersonIcon className="w-4 h-4" />
        Particuliers
      </button>
    </div>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
