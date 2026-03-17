'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  withText?: boolean
  href?: string
}

const sizes = {
  sm: 32,
  md: 44,
  lg: 80,
}

export function Logo({
  size = 'md',
  withText = true,
  href = '/',
}: LogoProps) {
  const px = sizes[size]

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
        fontFamily: 'var(--font-syne)',
        fontSize: size === 'lg' ? '22px' : size === 'md' ? '18px' : '14px',
        fontWeight: 800,
        color: 'var(--bt-gold)',
        letterSpacing: '0.06em',
        lineHeight: 1,
      }}>
        BLOCKTRUST
      </div>
      <div style={{
        fontFamily: 'var(--font-mono-bt)',
        fontSize: '9px',
        color: 'rgba(232,234,240,0.4)',
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
      gap: size === 'lg' ? '14px' : '10px',
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
