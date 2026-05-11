'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId } from 'react'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero'
  withText?: boolean
  href?: string
  /** Badge SVG officiel (défaut, aligné Navbar / landing) ou PNG (/logo.png) si besoin. */
  mark?: 'png' | 'badge'
  /** Classes Tailwind (ex. taille responsive sur le conteneur image) */
  className?: string
}

const sizes: Record<string, number> = {
  sm: 28,
  md: 36,
  lg: 80,
  hero: 380,
}

export function Logo({
  size = 'md',
  withText = true,
  href = '/',
  mark = 'badge',
  className = '',
}: LogoProps) {
  const px = sizes[size] ?? sizes.md
  const isHero = size === 'hero'
  const badgeInstanceId = useId().replace(/[^a-zA-Z0-9]/g, '')
  const showBadge = mark === 'badge' && !isHero

  const wrapperStyle =
    isHero
      ? {
          width: 'min(72vw, 380px)',
          height: 'min(72vw, 380px)',
          maxWidth: 380,
          maxHeight: 380,
        }
      : { width: px, height: px }

  const image = (
    <div className={`relative shrink-0 ${className}`.trim()} style={wrapperStyle}>
      {showBadge ? (
        <BlockTrustBadge size={px} instanceId={`logo-${badgeInstanceId}`} showWatermark={false} />
      ) : (
        <Image
          src="/logo.png"
          alt="BlockTrust"
          width={isHero ? 380 : px}
          height={isHero ? 380 : px}
          className="h-full w-full object-contain"
          priority
        />
      )}
    </div>
  )

  const text = withText && (
    <div style={{ minWidth: 0 }}>
      <div
        className={`font-syne font-extrabold leading-none tracking-wide text-bt-cyan ${
          isHero
            ? "text-sm sm:text-lg md:text-[22px]"
            : size === "lg"
              ? "text-[22px]"
              : size === "md"
                ? "text-lg"
                : "text-[11px]"
        } ${size === "sm" ? "tracking-[0.04em]" : "tracking-[0.08em]"}`}
      >
        BLOCKTRUST
      </div>
      <div className={isHero ? 'text-[8px] sm:text-[9px]' : ''} style={{
        fontFamily: 'var(--font-mono-bt), monospace',
        fontSize: isHero ? undefined : size === 'sm' ? '8px' : '9px',
        color: 'var(--bt-muted)',
        letterSpacing: '0.15em',
        marginTop: '2px',
      }}>
        BRNB TECH SASU
      </div>
    </div>
  )

  const content = (
    <div
      className="min-w-0"
      style={{
      display: 'flex',
      alignItems: 'center',
      gap: size === 'lg' || size === 'hero' ? '14px' : '10px',
      textDecoration: 'none',
    }}
    >
      {image}
      {text}
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} className="min-w-0 max-w-full" style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  )
}
