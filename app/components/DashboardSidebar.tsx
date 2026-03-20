// app/components/DashboardSidebar.tsx
// Sidebar réutilisable pour le dashboard client (serveur)
// ============================================================

import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import SignOutButton from './SignOutButton'
import { Logo } from '@/app/components/ui/Logo'
import DashboardSidebarNav, { type SidebarItem } from './DashboardSidebarNav'

export default async function DashboardSidebar() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return (
        <aside
          className="fixed left-0 top-0 h-full w-[220px] p-6 border-r"
          style={{ background: 'rgba(6,14,26,0.8)', borderRightColor: 'var(--bt-border)' }}
        >
          <div className="mb-8"><Logo size="md" withText={true} href="/dashboard" /></div>
          <div className="text-red-400 text-sm">Session non trouvée</div>
        </aside>
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
      ? [{ name: 'Administration', href: '/admin', icon: 'Shield' as const }]
      : []),
  ]

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[220px] p-6 border-r"
      style={{ background: 'rgba(6,14,26,0.8)', borderRightColor: 'var(--bt-border)' }}
    >
      <div className="mb-8"><Logo size="md" withText={true} href="/dashboard" /></div>
      <DashboardSidebarNav items={menuItems} />
      <div className="absolute bottom-6 left-6 right-6">
        <SignOutButton />
      </div>
    </aside>
  )
  } catch (error: any) {
    console.error('❌ Erreur dans DashboardSidebar:', error);
    return (
      <aside
        className="fixed left-0 top-0 h-full w-[220px] p-6 border-r"
        style={{ background: 'rgba(6,14,26,0.8)', borderRightColor: 'var(--bt-border)' }}
      >
        <div className="mb-8"><Logo size="md" withText={true} href="/dashboard" /></div>
        <div className="text-red-400 text-sm">Erreur de chargement</div>
      </aside>
    )
  }
}
