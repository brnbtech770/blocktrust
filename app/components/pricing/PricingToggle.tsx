'use client'

type Mode = 'B2C' | 'B2B'

type Props = {
  mode: Mode
  setMode: (m: Mode) => void
}

export default function PricingToggle({ mode, setMode }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Type de clientèle"
      className="mx-auto mb-8 flex w-full max-w-md flex-wrap justify-center gap-1 rounded-[10px] border border-white/10 bg-white/[0.05] p-1 sm:mb-10 sm:w-fit sm:max-w-none sm:flex-nowrap"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'B2C'}
        onClick={() => setMode('B2C')}
        className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:flex-initial sm:px-6 sm:text-base ${
          mode === 'B2C'
            ? 'bg-bt-cyan text-[#0a1628]'
            : 'bg-transparent text-white/50 hover:text-white'
        }`}
      >
        <PersonIcon className="h-4 w-4" />
        Particuliers
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'B2B'}
        onClick={() => setMode('B2B')}
        className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:flex-initial sm:px-6 sm:text-base ${
          mode === 'B2B'
            ? 'bg-bt-cyan text-[#0a1628]'
            : 'bg-transparent text-white/50 hover:text-white'
        }`}
      >
        <BuildingIcon className="h-4 w-4" />
        Entreprises
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
