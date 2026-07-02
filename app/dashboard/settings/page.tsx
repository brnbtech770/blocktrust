// app/dashboard/settings/page.tsx
// Paramètres compte — auth serveur + affichage session réelle (pas localStorage)
// ============================================================

import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { isAdmin } from '@/app/lib/admin'
import { getPlanWording, resolvePlanKeyForWording } from '@/lib/plan-wording'
import {
  buildDelegationRightsSummary,
  checkIsOrgAdmin,
  getUserCertificationCounts,
  getUserRole,
} from '@/lib/trust-delegation'
import SettingsClient from './SettingsClient'
import { userHasExtensionApiKey } from '@/lib/extension-api-key'
import { isActiveBillingStatus } from '@/lib/plan-features'

export const dynamic = 'force-dynamic'

function clampCertified(arr: string[], max: number): string[] {
  if (max <= 0) return []
  return arr.slice(0, max)
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/dashboard/settings')}`)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      image: true,
      extensionApiKeyHash: true,
      extensionApiKey: true,
      certifiedEmails: true,
      certifiedPhones: true,
      certifiedDomains: true,
      kycStatus: true,
      password: true,
      accountDeletionScheduledAt: true,
      plan: { select: { type: true } },
    },
  })

  if (!user?.email) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/dashboard/settings')}`)
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { plan: true, status: true, stripeSubscriptionId: true },
  })

  const hasActiveSubscription = Boolean(
    subscription?.stripeSubscriptionId && isActiveBillingStatus(subscription.status),
  )

  const planKey = resolvePlanKeyForWording({
    planType: user.plan?.type,
    subscriptionPlan: subscription?.plan,
    subscriptionStatus: subscription?.status,
  })

  const entityCount = await prisma.entity.count({
    where: { userId: session.user.id },
  })

  const org = await prisma.organization.findFirst({
    where: {
      OR: [{ ownerId: session.user.id }, { members: { some: { userId: session.user.id } } }],
    },
    select: { id: true, maxSeats: true, _count: { select: { members: true } } },
  })

  const isOrgAdmin = await checkIsOrgAdmin(session.user.id)
  const delegationRole = getUserRole({
    kycStatus: user.kycStatus,
    isAdmin: isAdmin(user.email),
    isOrgAdmin,
  })
  const certificationCounts = await getUserCertificationCounts(session.user.id, org?.id)
  const delegationRights = buildDelegationRightsSummary(
    delegationRole,
    user.kycStatus,
    certificationCounts,
  )

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

  const planWording = getPlanWording(planKey, wordingUserCount, wordingMaxUsers)

  return (
    <SettingsClient
      user={{ email: user.email, name: user.name, image: user.image }}
      hasPassword={Boolean(user.password && user.password.length > 0)}
      extensionKeyInitial={{
        hasKey: userHasExtensionApiKey(user.extensionApiKeyHash),
        masked: user.extensionApiKey ?? null,
      }}
      certifiedContacts={{
        certifiedEmails: clampCertified(user.certifiedEmails ?? [], planWording.maxCertifiedEmails),
        certifiedPhones: clampCertified(user.certifiedPhones ?? [], planWording.maxCertifiedPhones),
        certifiedDomains: clampCertified(user.certifiedDomains ?? [], planWording.maxCertifiedDomains),
      }}
      planWording={planWording}
      delegationRights={delegationRights}
      accountDeletionScheduledAt={
        user.accountDeletionScheduledAt?.toISOString() ?? null
      }
      hasActiveSubscription={hasActiveSubscription}
    />
  )
}
