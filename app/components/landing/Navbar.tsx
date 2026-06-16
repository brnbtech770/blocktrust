'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Newspaper, ScanLine } from 'lucide-react'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'

type NavLink = { label: string; href: string; verifyScan?: boolean; newsp?: boolean }

const navLinks: NavLink[] = [
  { label: 'Comment ça marche', href: '/how-to' },
  { label: 'Vérifier', href: '/verify', verifyScan: true },
  { label: 'Tarifs', href: '/pricing' },
  { label: 'Actualités', href: '/menaces', newsp: true },
  { label: 'FAQ', href: '/faq' },
]

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function navLinkClass(active: boolean): string {
  return active
    ? 'text-bt-cyan text-sm font-medium transition flex items-center gap-1.5 underline decoration-bt-cyan/60 underline-offset-4'
    : 'text-white/60 hover:text-white text-sm transition flex items-center gap-1.5 cursor-pointer'
}

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY
      if (currentY < 16) {
        setHeaderVisible(true)
      } else if (currentY > lastScrollY.current + 4) {
        setHeaderVisible(false)
      } else if (currentY < lastScrollY.current - 4) {
        setHeaderVisible(true)
      }
      lastScrollY.current = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 flex h-14 items-center overflow-x-clip border-b px-4 backdrop-blur-[16px] transition-transform duration-300 sm:h-16 sm:px-6 lg:px-8 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{
          background: 'rgba(10,22,40,0.92)',
          borderBottomColor: 'var(--bt-border)',
        }}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between gap-2">
          <div className="min-w-0 shrink-0">
            <Link
              href="/"
              className="flex cursor-pointer items-center gap-3"
              style={{ textDecoration: 'none' }}
              aria-label="Retour à l'accueil BLOCKTRUST™"
            >
              <BlockTrustBadge
                size={44}
                instanceId="navbar"
                showWatermark={false}
                className="shrink-0 drop-shadow-[0_0_12px_rgba(0,212,255,0.6)]"
              />
              <span className="font-syne text-base font-bold leading-none tracking-wider neon-cyan sm:text-lg">
                BLOCKTRUST<span className="text-[10px] align-super">™</span>
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ label, href, verifyScan, newsp }) => {
              const active = isActivePath(pathname, href)
              const className = navLinkClass(active)
              if (verifyScan) {
                return (
                  <Link key={href} href={href} className={className}>
                    <ScanLine className="w-4 h-4" aria-hidden />
                    {label}
                  </Link>
                )
              }
              if (newsp) {
                return (
                  <Link key={href} href={href} className={className}>
                    <Newspaper className="w-4 h-4 shrink-0" aria-hidden />
                    {label}
                  </Link>
                )
              }
              return (
                <Link key={href} href={href} className={className}>
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[var(--bt-cyan)] hover:text-[var(--bt-cyan)]"
              style={{ borderColor: 'var(--bt-border)' }}
            >
              Connexion
            </Link>
            <Link
              href="/auth/register"
              className="cursor-pointer rounded-lg px-5 py-2 text-sm font-bold transition-colors hover:bg-[#00b8e6]"
              style={{ background: '#00d4ff', color: '#0a1628' }}
            >
              Certifier mon identité
            </Link>
          </div>

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-lg border p-2 text-white md:hidden"
            style={{ borderColor: 'var(--bt-border)' }}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      <div className="h-14 sm:h-16" aria-hidden />

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            className="fixed inset-0 z-40 cursor-pointer bg-black/50 backdrop-blur-[2px] md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="fixed inset-x-0 top-14 z-50 border-b backdrop-blur-[16px] md:hidden sm:top-16"
            style={{
              background: 'rgba(10,22,40,0.98)',
              borderBottomColor: 'var(--bt-border)',
            }}
          >
            <nav className="flex flex-col gap-1 px-4 py-4">
              {navLinks.map(({ label, href, verifyScan, newsp }) => {
                const active = isActivePath(pathname, href)
                const itemClass = active
                  ? 'flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-bt-cyan'
                  : 'flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg px-4 py-3 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white'
                if (verifyScan) {
                  return (
                    <Link key={href} href={href} className={itemClass} onClick={() => setMenuOpen(false)}>
                      <ScanLine className="w-4 h-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  )
                }
                if (newsp) {
                  return (
                    <Link key={href} href={href} className={itemClass} onClick={() => setMenuOpen(false)}>
                      <Newspaper className="w-4 h-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  )
                }
                return (
                  <Link key={href} href={href} className={itemClass} onClick={() => setMenuOpen(false)}>
                    {label}
                  </Link>
                )
              })}
              <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--bt-border)' }}>
                <Link
                  href="/auth/signin"
                  className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium"
                  style={{ color: 'white', borderColor: 'var(--bt-border)' }}
                  onClick={() => setMenuOpen(false)}
                >
                  Connexion
                </Link>
                <Link
                  href="/auth/register"
                  className="mt-2 flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg px-4 py-3 text-center text-sm font-bold"
                  style={{ background: '#00d4ff', color: '#0a1628' }}
                  onClick={() => setMenuOpen(false)}
                >
                  Certifier mon identité
                </Link>
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </>
  )
}
