'use client'

import { usePathname } from 'next/navigation'

const titles: Record<string, string> = {
  '/admin': 'Tableau de bord',
  '/admin/dashboard': 'Tableau de bord',
  '/admin/clients': 'Vue clients',
  '/admin/users': 'Utilisateurs',
  '/admin/organizations': 'Organisations B2B',
  '/admin/certificates': 'Certificats',
  '/admin/kyc': 'KYC',
  '/admin/demandes': 'Demandes Trust',
  '/admin/surveillance': 'Surveillance IA',
  '/admin/alerts': 'Alertes & Surveillance',
  '/admin/ai-alerts': 'Alertes & Surveillance',
  '/admin/team': 'Équipe BLOCKTRUST',
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
      className="flex h-[52px] shrink-0 items-center border-b px-4 sm:h-[60px] sm:px-6 lg:px-8"
      style={{
        background: 'rgba(6,14,26,0.95)',
        borderBottomColor: 'var(--bt-border)',
      }}
    >
      <h1 className="font-syne min-w-0 truncate text-lg font-extrabold tracking-tight text-white sm:text-2xl lg:text-3xl">
        {title}
      </h1>
    </header>
  )
}
