// app/components/DashboardSidebar.tsx
// Contenu sidebar (sans position fixed : géré par DashboardChrome)
// ============================================================

import Link from 'next/link'
import { Crown } from 'lucide-react'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { isDashboardAdmin } from '@/app/lib/admin'
import SignOutButton from './SignOutButton'
import DashboardSidebarNav, { type SidebarSection } from './DashboardSidebarNav'

import { userHasWhiteLabelAccess } from '@/lib/whitelabel-access'
import { hasOrgAccess } from '@/lib/vault-utils'
import { getPlanWording, resolvePlanKeyForWording } from '@/lib/plan-wording'
import { planAllowsTrustCircle, resolveEffectivePlan } from '@/lib/plan-features'

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
    const userIsAdmin = isDashboardAdmin(session.user.email)

    const subscription = user
      ? await prisma.subscription.findUnique({
          where: { userId: user.id },
          select: {
            plan: true,
            status: true,
            stripeSubscriptionId: true,
            currentPeriodEnd: true,
          },
        })
      : null

    const entityCount = user
      ? await prisma.entity.count({ where: { userId: user.id } })
      : 0

    const org = user
      ? await prisma.organization.findFirst({
          where: {
            OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
          },
          select: { maxSeats: true, _count: { select: { members: true } } },
        })
      : null

    const planKey = resolvePlanKeyForWording({
      planType: plan?.type,
      subscriptionPlan: subscription?.plan,
      subscriptionStatus: subscription?.status,
    })

    let wordingUserCount: number | undefined
    let wordingMaxUsers: number | undefined
    if (planKey === 'B2C_FAMILLE' || planKey === 'B2C_FAMILLE_PLUS') {
      wordingUserCount = entityCount
    } else if (
      planKey === 'B2B_STARTER' ||
      planKey === 'B2B_TEAM' ||
      planKey === 'B2B_BUSINESS'
    ) {
      if (org) {
        wordingUserCount = org._count.members
        wordingMaxUsers = org.maxSeats
      }
    }

    const wording = getPlanWording(planKey, wordingUserCount, wordingMaxUsers)
    const showWhiteLabel = user
      ? userHasWhiteLabelAccess({
          subscriptionPlan: subscription?.plan,
          subscriptionStatus: subscription?.status,
          userPlanType: plan?.type,
        })
      : false

    const hasB2BSubscription =
      subscription?.status === 'active' &&
      subscription.plan != null &&
      hasOrgAccess(subscription.plan)

    const isMemberOfOrg = user
      ? await prisma.organizationMember
          .findFirst({
            where: { userId: user.id, joinedAt: { not: null } },
            select: { id: true },
          })
          .catch(() => null)
      : null

    const showB2BOrgVault = hasB2BSubscription || Boolean(isMemberOfOrg)

    const effectivePlan = resolveEffectivePlan({
      subscription,
      email: session.user.email,
      planType: plan?.type,
    })
    const trustCircleAllowed = planAllowsTrustCircle(effectivePlan)

    const trustCircleItem = trustCircleAllowed
      ? { name: 'Trust Circle', href: '/dashboard/trust-circle', icon: 'Users' as const }
      : {
          name: 'Trust Circle',
          href: `/pricing?feature=trustCircle&message=${encodeURIComponent(
            'Abonnez-vous pour accéder au Trust Circle — disponible à partir de Premium et des plans professionnels.'
          )}`,
          icon: 'Users' as const,
        }

    const sections: SidebarSection[] = [
      {
        items: [
          { name: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
          { name: wording.badgeLabel, href: '/dashboard/certificates', icon: 'Shield' },
        ],
      },
      {
        label: 'Mon réseau',
        items: [
          { name: wording.contactsLabel, href: '/dashboard/entities', icon: 'Building' },
          trustCircleItem,
          { name: 'Signatures BIS', href: '/dashboard/bis', icon: 'FileSignature' as const },
          ...(showB2BOrgVault
            ? [
                {
                  name: 'Coffre-fort',
                  href: '/dashboard/vault',
                  icon: 'ShieldCheck' as const,
                  lockTooltip:
                    'Stockez et protégez vos données de référence (RIB, IBAN)',
                },
                {
                  name: 'Équipe & organisation',
                  href: '/dashboard/organization',
                  icon: 'Building2' as const,
                  lockTooltip: 'Gérez les membres de votre organisation',
                },
              ]
            : []),
        ],
      },
      {
        label: 'Paramètres',
        items: [
          { name: 'Facturation', href: '/dashboard/billing', icon: 'CreditCard' },
          { name: 'Paramètres', href: '/dashboard/settings', icon: 'Settings' },
          {
            name: 'Extensions',
            href: '/dashboard/extension',
            icon: 'Puzzle' as const,
          },
          ...(showWhiteLabel
            ? [
                {
                  name: 'API & Marque blanche',
                  href: '/dashboard/white-label',
                  icon: 'Palette' as const,
                },
              ]
            : [
                {
                  name: 'API & Marque blanche',
                  href: '/dashboard/white-label',
                  icon: 'Lock' as const,
                  locked: true,
                  lockTooltip: 'Plan Business requis',
                },
              ]),
        ],
      },
    ]

    return (
      <div className={shellClass()}>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {userIsAdmin ? (
            <Link
              href="/admin/dashboard"
              className="mb-2 flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#BDA76B] transition hover:bg-[#BDA76B]/5 hover:text-[#BDA76B]/80"
            >
              <Crown className="h-3 w-3 shrink-0" aria-hidden />
              Vue Admin
            </Link>
          ) : null}
          <DashboardSidebarNav sections={sections} />
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed text-white/45">
            <p>
              <span className="font-semibold text-white/65">{wording.contactsLabel}</span> — personnes ou
              entreprises que vous certifiez dans votre réseau.
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
  } catch (error: unknown) {
    console.error('❌ Erreur dans DashboardSidebar:', error)
    return (
      <div className={shellClass()}>
        <div className="text-red-400 text-sm">Erreur de chargement</div>
      </div>
    )
  }
}
