// app/dashboard/settings/page.tsx
// Paramètres compte — auth serveur + affichage session réelle (pas localStorage)
// ============================================================

import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { getPlanWording, resolvePlanKeyForWording } from '@/lib/plan-wording'
import SettingsClient from './SettingsClient'

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
      plan: { select: { type: true } },
    },
  })

  if (!user?.email) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/dashboard/settings')}`)
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { plan: true, status: true },
  })

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
    select: { maxSeats: true, _count: { select: { members: true } } },
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

  const planWording = getPlanWording(planKey, wordingUserCount, wordingMaxUsers)

  const debugUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      planId: true,
      plan: { select: { type: true } },
      subscription: {
        select: {
          plan: true,
          status: true,
        },
      },
    },
  })
  console.log(
    '=== DEBUG PLAN ===',
    JSON.stringify({
      email: debugUser?.email,
      planId: debugUser?.planId,
      planType: debugUser?.plan?.type,
      subPlan: debugUser?.subscription?.plan,
      subStatus: debugUser?.subscription?.status,
    }),
  )

  return (
    <SettingsClient
      user={{ email: user.email, name: user.name, image: user.image }}
      extensionKeyInitial={{
        hasKey: Boolean(user.extensionApiKeyHash),
        masked: user.extensionApiKey ?? null,
      }}
      certifiedContacts={{
        certifiedEmails: clampCertified(user.certifiedEmails ?? [], planWording.maxCertifiedEmails),
        certifiedPhones: clampCertified(user.certifiedPhones ?? [], planWording.maxCertifiedPhones),
        certifiedDomains: clampCertified(user.certifiedDomains ?? [], planWording.maxCertifiedDomains),
      }}
      planWording={planWording}
    />
  )
}
