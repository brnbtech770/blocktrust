// app/components/DashboardSidebar.tsx
// Sidebar réutilisable pour le dashboard client (serveur)
// ============================================================

import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import SignOutButton from './SignOutButton'
import { 
  Home, 
  Building, 
  Shield, 
  Users, 
  CreditCard, 
  Settings 
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardSidebar() {
  console.log('[DEBUG] DashboardSidebar entry');
  try {
    const session = await auth()
    console.log('[DEBUG] After auth() in sidebar', {hasSession: !!session, hasEmail: !!session?.user?.email});
    
    if (!session?.user?.email) {
      return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 p-6">
          <div className="text-3xl font-bold text-white mb-8 tracking-tight">🛡️ BlockTrust</div>
          <div className="text-red-400 text-sm">Session non trouvée</div>
        </aside>
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { plan: true },
    })

    const plan = user?.plan || null

  const menuItems = [
    { name: 'Tableau de bord', href: '/dashboard', icon: Home },
    { name: 'Mes entités', href: '/dashboard/entities', icon: Building },
    { name: 'Mes certificats', href: '/dashboard/certificates', icon: Shield },
    // Trust Circle seulement si activé, sinon afficher avec 🔒
    ...(plan?.trustCircleEnabled 
      ? [{ name: 'Trust Circle', href: '/dashboard/trust-circle', icon: Users }]
      : [{ name: 'Trust Circle 🔒', href: '/pricing?feature=trustCircle', icon: Users }]
    ),
    { name: 'Facturation', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 p-6">
      <div className="text-3xl font-bold text-white mb-8 tracking-tight">🛡️ BlockTrust</div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-base text-gray-400 hover:bg-gray-800/50 hover:text-white rounded-lg transition-colors font-medium"
            >
              <Icon size={22} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <SignOutButton />
      </div>
    </aside>
  )
  } catch (error: any) {
    console.error('❌ Erreur dans DashboardSidebar:', error);
    return (
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 p-6">
        <div className="text-3xl font-bold text-white mb-8 tracking-tight">🛡️ BlockTrust</div>
        <div className="text-red-400 text-sm">Erreur de chargement</div>
      </aside>
    )
  }
}
