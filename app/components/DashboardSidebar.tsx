// app/components/DashboardSidebar.tsx
// Contenu sidebar (sans position fixed : géré par DashboardChrome)
// ============================================================

import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import SignOutButton from './SignOutButton'
import DashboardSidebarNav, { type SidebarItem } from './DashboardSidebarNav'

function shellClass() {
  return 'flex h-full min-h-0 flex-col p-4 md:p-6'
}

export default async function DashboardSidebar() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return (
        <div className={shellClass()}>
          <div className="text-red-400 text-sm">Session non trouvée</div>
        </div>
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { plan: true },
    })

    const plan = user?.plan || null
    const userIsAdmin = isAdmin(session.user.email)

    const menuItems: SidebarItem[] = [
      { name: 'Tableau de bord', href: '/dashboard', icon: 'Home' },
      { name: 'Mes entités', href: '/dashboard/entities', icon: 'Building' },
      { name: 'Mes certificats', href: '/dashboard/certificates', icon: 'Shield' },
      ...(plan?.trustCircleEnabled
        ? [{ name: 'Trust Circle', href: '/dashboard/trust-circle', icon: 'Users' as const }]
        : [
            {
              name: 'Trust Circle',
              href: `/pricing?feature=trustCircle&message=${encodeURIComponent(
                'Abonnez-vous pour accéder au Trust Circle — disponible à partir des offres Famille et équivalents B2B.'
              )}`,
              icon: 'Users' as const,
            },
          ]),
      { name: 'Facturation', href: '/dashboard/billing', icon: 'CreditCard' },
      { name: 'Paramètres', href: '/dashboard/settings', icon: 'Settings' },
      ...(userIsAdmin
        ? [{ name: 'Administration', href: '/admin/dashboard', icon: 'Shield' as const }]
        : []),
    ]

    return (
      <div className={shellClass()}>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <DashboardSidebarNav items={menuItems} />
        </div>
        <div
          className="mt-auto shrink-0 border-t pt-4"
          style={{ borderTopColor: 'var(--bt-border)' }}
        >
          <SignOutButton />
        </div>
      </div>
    )
  } catch (error: any) {
    console.error('❌ Erreur dans DashboardSidebar:', error)
    return (
      <div className={shellClass()}>
        <div className="text-red-400 text-sm">Erreur de chargement</div>
      </div>
    )
  }
}
