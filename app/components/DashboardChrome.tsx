'use client'

import { Children, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Shell dashboard : sidebar fixe desktop, drawer + overlay sur mobile (< md).
 * Enfants attendus (ordre) : [0] sidebar (RSC), [1] contenu principal.
 */
export default function DashboardChrome({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() ?? ''

  const childList = Children.toArray(children)
  const sidebar = childList[0] ?? null
  const main = childList[1] ?? null

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bt-navy)]">
      <button
        type="button"
        className="md:hidden fixed top-3 left-3 z-[60] flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border text-white shadow-lg"
        style={{
          borderColor: 'var(--bt-border)',
          background: 'rgba(6,14,26,0.95)',
        }}
        aria-expanded={open}
        aria-controls="dashboard-sidebar-panel"
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open ? (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-[45] bg-black/55"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="dashboard-sidebar-panel"
        className={`fixed left-0 top-0 z-50 h-full w-full max-w-[min(280px,100vw)] transition-transform duration-200 ease-out md:w-[220px] md:max-w-none md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          background: 'rgba(6,14,26,0.98)',
          borderRight: '1px solid var(--bt-border)',
          boxShadow: open ? '8px 0 24px rgba(0,0,0,0.35)' : undefined,
        }}
      >
        {sidebar}
      </aside>

      <div className="min-h-screen pt-14 md:ml-[220px] md:pt-0">{main}</div>
    </div>
  )
}
