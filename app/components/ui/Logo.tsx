'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero'
  withText?: boolean
  href?: string
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
  className = '',
}: LogoProps) {
  const px = sizes[size] ?? sizes.md
  const isHero = size === 'hero'

  const image = (
    <div
      className={`relative shrink-0 ${className}`.trim()}
      style={
        isHero
          ? {
              width: 'min(72vw, 380px)',
              height: 'min(72vw, 380px)',
              maxWidth: 380,
              maxHeight: 380,
            }
          : { width: px, height: px }
      }
    >
      <Image
        src="/logo.png"
        alt="BlockTrust"
        width={isHero ? 380 : px}
        height={isHero ? 380 : px}
        className={isHero ? 'h-full w-full object-contain' : undefined}
        style={{ mixBlendMode: 'screen' }}
        priority
      />
    </div>
  )

  const text = withText && (
    <div style={{ minWidth: 0 }}>
      <div className={isHero ? 'text-sm sm:text-lg md:text-[22px]' : ''} style={{
        fontFamily: 'var(--font-syne), sans-serif',
        fontSize: isHero ? undefined : size === 'lg' ? '22px' : size === 'md' ? '18px' : '11px',
        fontWeight: 800,
        color: 'var(--bt-cyan)',
        letterSpacing: size === 'sm' ? '0.04em' : '0.08em',
        lineHeight: 1,
      }}>
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: size === 'lg' || size === 'hero' ? '14px' : '10px',
      textDecoration: 'none',
    }}>
      {image}
      {text}
    </div>
  )

  if (!href) return content

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  )
}
