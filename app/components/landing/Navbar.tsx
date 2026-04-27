'use client'

import { useState } from 'react'
import Link from 'next/link'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'

const navLinks = [
  { label: 'Comment ça marche', href: '/#comment' },
  { label: 'Tarifs', href: '/pricing' },
  { label: 'FAQ', href: '/pricing#faq' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header
      className="relative sticky top-0 z-50 flex h-14 items-center overflow-x-hidden border-b px-3 backdrop-blur-[16px] sm:h-16 sm:px-6 lg:px-8"
      style={{
        background: 'rgba(10,22,40,0.92)',
        borderBottomColor: 'var(--bt-border)',
      }}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center justify-between gap-2">
        <div className="min-w-0 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3"
            style={{ textDecoration: 'none' }}
            aria-label="Retour à l'accueil BlockTrust"
          >
            <BlockTrustBadge size={44} instanceId="navbar" className="shrink-0" />
            <span className="font-syne text-base font-bold leading-none tracking-[0.06em] text-white sm:text-lg">
              BLOCK<span className="text-bt-cyan">TRUST</span>
            </span>
          </Link>
        </div>

        {/* Desktop nav centre */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--bt-muted)' }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop droite */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="rounded-lg border px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[var(--bt-cyan)] hover:text-[var(--bt-cyan)]"
            style={{ borderColor: 'var(--bt-border)' }}
          >
            Connexion
          </Link>
          {/* prefetch=false : évite RSC prefetch non authentifié vers /dashboard/* (layout + auth()) */}
          <Link
            href="/dashboard/create"
            prefetch={false}
            className="rounded-lg px-5 py-2 text-sm font-bold transition-colors hover:bg-[#00b8e6]"
            style={{ background: '#00d4ff', color: '#0a1628' }}
          >
            Créer mon certificat
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="shrink-0 rounded-lg border p-2 text-white md:hidden"
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

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="absolute inset-x-0 top-full z-40 border-b backdrop-blur-[16px] md:hidden"
          style={{
            background: 'rgba(10,22,40,0.98)',
            borderBottomColor: 'var(--bt-border)',
          }}
        >
          <nav className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="py-3 px-4 rounded-lg text-sm font-medium text-white hover:bg-white/5"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="border-t mt-2 pt-2" style={{ borderColor: 'var(--bt-border)' }}>
              <Link
                href="/auth/signin"
                className="block py-3 px-4 rounded-lg text-sm font-medium border"
                style={{ color: 'white', borderColor: 'var(--bt-border)' }}
                onClick={() => setMenuOpen(false)}
              >
                Connexion
              </Link>
              <Link
                href="/dashboard/create"
                prefetch={false}
                className="block py-3 px-4 rounded-lg text-sm font-bold mt-2 text-center"
                style={{ background: '#00d4ff', color: '#0a1628' }}
                onClick={() => setMenuOpen(false)}
              >
                Créer mon certificat
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
