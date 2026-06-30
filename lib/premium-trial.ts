// lib/premium-trial.ts
// Trial Premium B2C gratuit (ambassadeurs / beta) — sans Stripe
// ============================================================

import { prisma } from '@/app/lib/db'
import { ensureBadgeSignature } from '@/lib/admin-bootstrap'
import { appBaseUrl, recentAuditLogExists } from '@/lib/agents/agent-utils'
import { sendEmailFireAndForget } from '@/lib/email'
import { isActiveBillingStatus } from '@/lib/plan-features'
import type { PlanType, ValidationLevel } from '@prisma/client'
import * as React from 'react'
import {
  PremiumTrialExpiredEmail,
  premiumTrialExpiredSubject,
} from '@/emails/PremiumTrialExpiredEmail'
import {
  PremiumTrialWelcomeEmail,
  premiumTrialWelcomeSubject,
} from '@/emails/PremiumTrialWelcomeEmail'

export const PREMIUM_TRIAL_END = new Date('2026-09-29T23:59:59.999+02:00')

export const PREMIUM_TRIAL_AMBASSADOR_EMAILS = [
  'jimacoca@gmail.com',
  'jusaadoun@gmail.com',
] as const

const PREMIUM_PLAN_TYPE: PlanType = 'B2C_PREMIUM'
const PREMIUM_VALIDATION: ValidationLevel = 'PREMIUM'
const DISCOVERY_VALIDATION: ValidationLevel = 'DISCOVERY'

const CONTACT_FROM = 'BLOCKTRUST™ <contact@blocktrust.tech>'

export type PremiumTrialSubscription = {
  plan?: string | null
  status?: string | null
  stripeSubscriptionId?: string | null
  currentPeriodEnd?: Date | null
}

/** Trial Premium actif sans abonnement Stripe (currentPeriodEnd = fin d'essai). */
export function isPremiumTrialSubscription(sub: PremiumTrialSubscription | null | undefined): boolean {
  if (!sub) return false
  const plan = (sub.plan ?? '').trim().toUpperCase()
  return (
    plan === 'PREMIUM' &&
    isActiveBillingStatus(sub.status) &&
    !sub.stripeSubscriptionId &&
    sub.currentPeriodEnd instanceof Date
  )
}

export function isExpiredPremiumTrial(sub: PremiumTrialSubscription | null | undefined): boolean {
  if (!isPremiumTrialSubscription(sub) || !sub?.currentPeriodEnd) return false
  return sub.currentPeriodEnd.getTime() < Date.now()
}

/** Libellé facturation admin / dashboard pour un trial Premium sans Stripe. */
export function getPremiumTrialBillingLabel(): string {
  return 'Gratuit (essai Premium)'
}

export function formatPremiumTrialEndFr(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function getPremiumTrialPeriodLabel(end: Date): string {
  return `Essai · fin ${formatPremiumTrialEndFr(end)}`
}

function emailLocalDisplayName(email: string): string {
  const local = email.split('@')[0] ?? 'Utilisateur'
  return local.charAt(0).toUpperCase() + local.slice(1)
}

function entityDisplayName(
  entity: {
    firstName: string | null
    lastName: string | null
    legalName: string | null
    tradeName: string | null
  } | null,
  email: string,
): string {
  if (entity) {
    const full = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim()
    if (full) return full
    if (entity.legalName?.trim()) return entity.legalName.trim()
    if (entity.tradeName?.trim()) return entity.tradeName.trim()
  }
  return emailLocalDisplayName(email)
}

async function linkEntityByEmailToUser(email: string, userId: string): Promise<boolean> {
  const entity = await prisma.entity.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true },
  })

  if (!entity || entity.userId === userId) {
    return false
  }

  await prisma.entity.update({
    where: { id: entity.id },
    data: { userId },
  })

  return true
}

async function ensureUserForPremiumTrial(email: string) {
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { subscription: true },
  })

  if (existingUser) {
    const linkedEntity = await linkEntityByEmailToUser(email, existingUser.id)
    return { user: existingUser, userCreated: false as const, linkedEntity }
  }

  const existingEntity = await prisma.entity.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      legalName: true,
      tradeName: true,
    },
  })

  const displayName = entityDisplayName(existingEntity, email)

  const user = await prisma.user.create({
    data: {
      email,
      name: displayName,
      kycStatus: 'PENDING',
      accountType: 'PERSONAL',
    },
    include: { subscription: true },
  })

  if (existingEntity) {
    await prisma.entity.update({
      where: { id: existingEntity.id },
      data: { userId: user.id },
    })
  }

  return { user, userCreated: true as const, linkedEntity: existingEntity != null }
}

async function resolveTrialEntity(email: string, userId: string) {
  let linkedEntity = await linkEntityByEmailToUser(email, userId)

  let entity = await prisma.entity.findFirst({
    where: {
      OR: [{ userId }, { email: { equals: email, mode: 'insensitive' } }],
    },
    orderBy: { createdAt: 'asc' },
  })

  if (entity && entity.userId !== userId) {
    await prisma.entity.update({
      where: { id: entity.id },
      data: { userId },
    })
    linkedEntity = true
    entity = await prisma.entity.findUniqueOrThrow({ where: { id: entity.id } })
  }

  return { entity, linkedEntity }
}

async function syncTrialAmbassadorUser(
  userId: string,
  email: string,
  entity: { kycStatus: string; firstName: string | null; lastName: string | null } | null,
  displayName: string,
): Promise<void> {
  const entityVerified = entity?.kycStatus === 'VERIFIED'

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: displayName,
      ...(entityVerified
        ? {
            kycStatus: 'VERIFIED',
            kycVerifiedAt: new Date(),
          }
        : {}),
      certifiedEmails: [email],
    },
  })
}

function splitDisplayName(userName: string, email: string): { firstName: string; lastName: string | null } {
  const trimmed = userName.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/)
    if (parts.length === 1) return { firstName: parts[0], lastName: null }
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
  }
  const local = email.split('@')[0] ?? 'Utilisateur'
  return { firstName: local.charAt(0).toUpperCase() + local.slice(1), lastName: null }
}

function formatTrialEndFr(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export type GrantPremiumTrialResult =
  | {
      ok: true
      userId: string
      trialEndsAt: Date
      welcomeEmailSent: boolean
      badgeJwtStored: boolean
      entityLinked: boolean
      skipped?: false
    }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; reason: string }

export function resolvePremiumTrialDisplayName(
  entity: {
    firstName: string | null
    lastName: string | null
    legalName: string | null
    tradeName: string | null
  } | null,
  email: string,
): string {
  return entityDisplayName(entity, email)
}

export async function grantPremiumTrial(params: {
  email: string
  trialEndsAt?: Date
  sendWelcomeEmail?: boolean
}): Promise<GrantPremiumTrialResult> {
  const email = params.email.trim().toLowerCase()
  const trialEndsAt = params.trialEndsAt ?? PREMIUM_TRIAL_END

  const { user } = await ensureUserForPremiumTrial(email)

  const sub = user.subscription
  if (sub?.stripeSubscriptionId && isActiveBillingStatus(sub.status)) {
    return { ok: false, skipped: true, reason: 'Abonnement Stripe actif — non modifié' }
  }

  const premiumPlan = await prisma.plan.findFirst({
    where: { type: PREMIUM_PLAN_TYPE, isActive: true },
    orderBy: [{ maxEntities: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  })

  if (!premiumPlan) {
    return { ok: false, reason: 'Plan B2C_PREMIUM introuvable en base' }
  }

  await prisma.plan.update({
    where: { id: premiumPlan.id },
    data: {
      maxEntities: 100,
      trustCircleEnabled: true,
      blockchainAnchor: true,
    },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { planId: premiumPlan.id },
  })

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      plan: 'PREMIUM',
      status: 'active',
      currentPeriodEnd: trialEndsAt,
    },
    update: {
      plan: 'PREMIUM',
      status: 'active',
      currentPeriodEnd: trialEndsAt,
    },
  })

  const { entity: resolvedEntity, linkedEntity } = await resolveTrialEntity(email, user.id)

  let entity = resolvedEntity

  const displayName =
    entity != null
      ? entityDisplayName(entity, email)
      : (user.name ?? emailLocalDisplayName(email))
  const { firstName, lastName } = splitDisplayName(displayName, email)

  if (!entity) {
    entity = await prisma.entity.create({
      data: {
        userId: user.id,
        entityType: 'INDIVIDUAL',
        firstName,
        lastName,
        email,
        certifiedEmails: [email],
        kycStatus: 'VERIFIED',
        validationLevel: PREMIUM_VALIDATION,
        emailVerified: true,
      },
    })
  } else {
    await prisma.entity.update({
      where: { id: entity.id },
      data: {
        validationLevel: PREMIUM_VALIDATION,
        kycStatus: 'VERIFIED',
        emailVerified: true,
        certifiedEmails: entity.certifiedEmails.includes(email)
          ? entity.certifiedEmails
          : [...entity.certifiedEmails, email],
        ...(entity.firstName ? {} : { firstName }),
        ...(entity.lastName ? {} : { lastName }),
      },
    })
    entity = await prisma.entity.findUniqueOrThrow({ where: { id: entity.id } })
  }

  await syncTrialAmbassadorUser(user.id, email, entity, displayName)

  let certificate = await prisma.certificate.findFirst({
    where: {
      entityId: entity.id,
      status: { in: ['ACTIVE', 'ANCHORED'] },
    },
    orderBy: { issuedAt: 'asc' },
  })

  if (!certificate) {
    const pending = await prisma.certificate.findFirst({
      where: { entityId: entity.id, status: 'PENDING' },
      orderBy: { issuedAt: 'asc' },
    })
    if (pending) {
      certificate = await prisma.certificate.update({
        where: { id: pending.id },
        data: { level: PREMIUM_VALIDATION, status: 'ACTIVE', issuedAt: new Date() },
      })
    } else {
      certificate = await prisma.certificate.create({
        data: {
          entityId: entity.id,
          level: PREMIUM_VALIDATION,
          status: 'ACTIVE',
          issuedAt: new Date(),
        },
      })
    }
  } else if (certificate.level !== PREMIUM_VALIDATION) {
    certificate = await prisma.certificate.update({
      where: { id: certificate.id },
      data: { level: PREMIUM_VALIDATION },
    })
  }

  const badgeResult = await ensureBadgeSignature(certificate.id, user.id).catch(() => ({
    jwtStored: false,
  }))

  let welcomeEmailSent = false
  if (params.sendWelcomeEmail) {
    welcomeEmailSent = await sendPremiumTrialWelcomeIfNeeded(user.id, email, firstName, trialEndsAt)
  }

  return {
    ok: true,
    userId: user.id,
    trialEndsAt,
    welcomeEmailSent,
    badgeJwtStored: badgeResult.jwtStored,
    entityLinked: linkedEntity,
  }
}

export async function sendPremiumTrialWelcomeIfNeeded(
  userId: string,
  email: string,
  firstName: string,
  trialEndsAt: Date,
): Promise<boolean> {
  const alreadySent = await recentAuditLogExists('PREMIUM_TRIAL_WELCOME', userId, new Date(0))
  if (alreadySent) return false

  const base = appBaseUrl()
  sendEmailFireAndForget({
    to: email,
    from: CONTACT_FROM,
    subject: premiumTrialWelcomeSubject,
    react: React.createElement(PremiumTrialWelcomeEmail, {
      firstName,
      trialEndsAt: formatTrialEndFr(trialEndsAt),
      dashboardUrl: `${base}/dashboard`,
      pricingUrl: `${base}/pricing`,
    }),
  })

  await prisma.auditLog
    .create({
      data: {
        action: 'PREMIUM_TRIAL_WELCOME',
        resource: 'user',
        resourceId: userId,
        userId,
      },
    })
    .catch(() => null)

  return true
}

export type PremiumTrialExpiryResult = {
  downgraded: number
  emailsSent: number
}

export async function runPremiumTrialExpiry(): Promise<PremiumTrialExpiryResult> {
  const now = new Date()
  let downgraded = 0
  let emailsSent = 0

  const expiredTrials = await prisma.subscription.findMany({
    where: {
      plan: 'PREMIUM',
      status: 'active',
      stripeSubscriptionId: null,
      currentPeriodEnd: { lt: now },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    take: 50,
  })

  const base = appBaseUrl()
  const pricingUrl = `${base}/pricing`

  for (const sub of expiredTrials) {
    if (!isExpiredPremiumTrial(sub)) continue

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        plan: 'DISCOVERY',
        status: 'inactive',
        currentPeriodEnd: null,
      },
    })

    await prisma.user.update({
      where: { id: sub.userId },
      data: { planId: null },
    })

    const entities = await prisma.entity.findMany({
      where: { userId: sub.userId },
      select: { id: true },
    })

    if (entities.length > 0) {
      await prisma.entity.updateMany({
        where: { userId: sub.userId, validationLevel: PREMIUM_VALIDATION },
        data: { validationLevel: DISCOVERY_VALIDATION },
      })

      await prisma.certificate.updateMany({
        where: {
          entityId: { in: entities.map((e) => e.id) },
          level: PREMIUM_VALIDATION,
        },
        data: { level: DISCOVERY_VALIDATION },
      })
    }

    downgraded += 1

    const email = sub.user.email
    if (!email) continue

    const alreadySent = await recentAuditLogExists(
      'PREMIUM_TRIAL_EXPIRED',
      sub.userId,
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    )
    if (alreadySent) continue

    const localPart = email.split('@')[0] ?? 'Utilisateur'
    const firstName =
      sub.user.name?.trim().split(/\s+/)[0] ??
      localPart.charAt(0).toUpperCase() + localPart.slice(1)

    sendEmailFireAndForget({
      to: email,
      from: CONTACT_FROM,
      subject: premiumTrialExpiredSubject,
      react: React.createElement(PremiumTrialExpiredEmail, {
        firstName,
        pricingUrl,
      }),
    })

    await prisma.auditLog
      .create({
        data: {
          action: 'PREMIUM_TRIAL_EXPIRED',
          resource: 'user',
          resourceId: sub.userId,
          userId: sub.userId,
        },
      })
      .catch(() => null)

    emailsSent += 1
  }

  return { downgraded, emailsSent }
}
