'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero'
  withText?: boolean
  href?: string
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
}: LogoProps) {
  const px = sizes[size] ?? sizes.md

  const image = (
    <div style={{ position: 'relative', width: px, height: px, flexShrink: 0 }}>
      <Image
        src="/logo.png"
        alt="BlockTrust"
        width={px}
        height={px}
        style={{ mixBlendMode: 'screen' }}
        priority
      />
    </div>
  )

  const text = withText && (
    <div>
      <div style={{
        fontFamily: 'var(--font-syne), sans-serif',
        fontSize: size === 'lg' || size === 'hero' ? '22px' : size === 'md' ? '18px' : '14px',
        fontWeight: 800,
        color: 'var(--bt-cyan)',
        letterSpacing: '0.08em',
        lineHeight: 1,
      }}>
        BLOCKTRUST
      </div>
      <div style={{
        fontFamily: 'var(--font-mono-bt), monospace',
        fontSize: '9px',
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
