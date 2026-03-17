'use client'

export type PlanCardProps = {
  mode: 'B2C' | 'B2B'
  name: string
  description: string
  price: number | string
  priceUnit?: string
  subtitle: string
  badges: { label: string; style: 'gold' | 'muted' | 'multiSupport' }[]
  features: string[]
  cta: string
  ctaStyle: { background: string; border?: string; color: string }
  isPopular: boolean
  icon: 'person' | 'shield' | 'group' | 'crown'
  ctaHref?: string
  ctaOnClick?: () => void
  ctaDisabled?: boolean
  ctaLoading?: boolean
}

const ICONS = {
  person: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  ),
  shield: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  ),
  group: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  ),
  crown: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  ),
}

export default function PlanCard({
  mode,
  name,
  description,
  price,
  priceUnit = '/mois',
  subtitle,
  badges,
  features,
  cta,
  ctaStyle,
  isPopular,
  icon,
  ctaHref,
  ctaOnClick,
  ctaDisabled = false,
  ctaLoading = false,
}: PlanCardProps) {
  const checkColor = mode === 'B2B' ? '#00d4ff' : 'var(--bt-gold)'
  const popularBorder = mode === 'B2B' ? '#00d4ff' : 'var(--bt-gold)'

  return (
    <div
      className="relative flex flex-col rounded-2xl p-7 transition"
      style={{
        background: 'rgba(13,31,60,0.8)',
        border: `1px solid ${isPopular ? popularBorder : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isPopular ? '0 0 30px rgba(0,212,255,0.1)' : undefined,
      }}
    >
      {isPopular && (
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-4 whitespace-nowrap px-4 py-1 rounded-full text-xs font-bold"
          style={{
            background: mode === 'B2C' ? 'var(--bt-gold)' : '#00d4ff',
            color: '#0a1628',
          }}
        >
          Le plus populaire
        </div>
      )}

      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <svg className="w-8 h-8" style={{ color: 'var(--bt-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {ICONS[icon]}
          </svg>
        </div>
        <div>
          <h3
            className="text-lg font-bold"
            style={{ color: 'white', fontFamily: 'var(--font-syne), sans-serif' }}
          >
            {name}
          </h3>
          <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-4 mb-2">
        {typeof price === 'number' ? (
          <>
            <span
              className="text-[42px] md:text-4xl font-extrabold tabular-nums"
              style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'white' }}
            >
              {price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
            </span>
            <span className="text-base ml-1" style={{ color: 'var(--bt-muted)' }}>
              {priceUnit}
            </span>
          </>
        ) : (
          <span
            className="text-2xl md:text-3xl font-extrabold"
            style={{ fontFamily: 'var(--font-syne), sans-serif', color: 'var(--bt-gold)' }}
          >
            {price}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {badges.map((b, i) => (
          <span
            key={i}
            className="text-[11px] font-bold rounded-md px-2.5 py-1"
            style={
              b.style === 'gold'
                ? { background: 'var(--bt-gold)', color: '#0a1628' }
                : b.style === 'multiSupport'
                ? {
                    background: 'rgba(0,212,255,0.1)',
                    border: '1px solid rgba(0,212,255,0.3)',
                    color: '#00d4ff',
                  }
                : {
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }
            }
          >
            {b.label}
          </span>
        ))}
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--bt-muted)' }}>
        {description}
      </p>

      <ul className="flex-1 space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--bt-muted)', marginBottom: 8 }}>
            <svg className="w-[14px] h-[14px] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke={checkColor} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {ctaHref ? (
        <a
          href={ctaHref}
          className="w-full py-3.5 px-4 rounded-[10px] font-bold text-center text-sm transition hover:brightness-110 hover:-translate-y-px"
          style={{
            background: ctaStyle.background,
            border: ctaStyle.border ?? 'none',
            color: ctaStyle.color,
          }}
        >
          {cta}
        </a>
      ) : (
        <button
          type="button"
          onClick={ctaOnClick}
          disabled={ctaDisabled || ctaLoading}
          className="w-full py-3.5 px-4 rounded-[10px] font-bold text-sm transition hover:brightness-110 hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          style={{
            background: ctaStyle.background,
            border: ctaStyle.border ?? 'none',
            color: ctaStyle.color,
          }}
        >
          {ctaLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Redirection...
            </>
          ) : (
            cta
          )}
        </button>
      )}
    </div>
  )
}
