'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/admin': 'Tableau de bord',
  '/admin/certificates': 'Demandes de certificats',
  '/admin/users': 'Utilisateurs',
  '/admin/alerts': 'Alertes IA',
}

function getTitle(pathname: string): string {
  if (pathname in titles) return titles[pathname]
  if (pathname.startsWith('/admin/certificates/')) return 'Détail certificat'
  if (pathname.startsWith('/admin/users/')) return 'Détail utilisateur'
  return 'Admin'
}

export default function AdminPageHeader() {
  const pathname = usePathname()
  const title = getTitle(pathname ?? '')

  return (
    <header
      className="flex-shrink-0 flex items-center px-8 border-b"
      style={{
        height: 60,
        background: 'rgba(6,14,26,0.95)',
        borderBottomColor: 'var(--bt-border)',
      }}
    >
      <h1 className="font-syne text-xl font-extrabold tracking-tight text-white">
        {title}
      </h1>
    </header>
  )
}
