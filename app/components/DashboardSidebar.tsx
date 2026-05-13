// app/components/DashboardSidebar.tsx
// Contenu sidebar (sans position fixed : géré par DashboardChrome)
// ============================================================

import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import SignOutButton from './SignOutButton'
import DashboardSidebarNav, { type SidebarItem } from './DashboardSidebarNav'

import { userHasWhiteLabelAccess } from '@/lib/whitelabel-access'
import { hasOrgAccess } from '@/lib/vault-utils'

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

    const subscription = user
      ? await prisma.subscription.findUnique({
          where: { userId: user.id },
          select: { plan: true, status: true },
        })
      : null

    const showWhiteLabel = user
      ? userHasWhiteLabelAccess({
          subscriptionPlan: subscription?.plan,
          subscriptionStatus: subscription?.status,
          userPlanType: plan?.type,
        })
      : false

    const showB2BOrgVault =
      subscription?.status === 'active' &&
      subscription.plan != null &&
      hasOrgAccess(subscription.plan)

    const menuItems: SidebarItem[] = [
      { name: 'Tableau de bord', href: '/dashboard', icon: 'Home' },
      { name: 'Mes contacts', href: '/dashboard/entities', icon: 'Building' },
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
      ...(showB2BOrgVault
        ? [
            {
              name: 'Organisation',
              href: '/dashboard/organization',
              icon: 'Building2' as const,
            },
            {
              name: 'BlockTrust Vault',
              href: '/dashboard/vault',
              icon: 'ShieldCheck' as const,
            },
          ]
        : []),
      {
        name: 'API & Marque blanche',
        href: '/dashboard/white-label',
        icon: showWhiteLabel ? 'Palette' : 'Lock',
        locked: !showWhiteLabel,
        lockTooltip: 'Plan Business requis',
      },
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
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] leading-relaxed text-white/45">
            <p>
              <span className="font-semibold text-white/65">Contacts</span> — personnes ou entreprises que vous
              certifiez dans votre réseau.
            </p>
            <p className="mt-1.5">
              <span className="font-semibold text-white/65">Trust Circle</span> — contacts avec une relation de
              confiance mutuelle ; protection Cas&nbsp;1 / Cas&nbsp;2 activée.
            </p>
          </div>
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
