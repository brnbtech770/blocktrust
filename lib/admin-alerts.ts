// lib/admin-alerts.ts
// Création centralisée des alertes admin (opérations, fraude, etc.)
// ============================================================

import { prisma } from '@/app/lib/db'
import type { Prisma } from '@prisma/client'

export async function createAdminAlert(args: {
  type: string
  title: string
  description: string
  entityId?: string | null
  userId?: string | null
  metadata?: Record<string, unknown> | Prisma.InputJsonValue
}) {
  return prisma.adminAlert.create({
    data: {
      type: args.type,
      title: args.title,
      description: args.description,
      entityId: args.entityId ?? undefined,
      userId: args.userId ?? undefined,
      metadata:
        args.metadata === undefined
          ? undefined
          : (args.metadata as Prisma.InputJsonValue),
      read: false,
    },
  })
}

export async function createKycSubmittedAdminAlertIfNew(args: {
  userId: string
  email: string | null
  stripeSessionId: string
}) {
  const existing = await prisma.adminAlert.findFirst({
    where: {
      type: 'KYC_SUBMITTED',
      userId: args.userId,
      metadata: {
        path: ['stripeSessionId'],
        equals: args.stripeSessionId,
      },
    },
  })
  if (existing) return null

  return createAdminAlert({
    type: 'KYC_SUBMITTED',
    title: 'KYC en attente de validation',
    description: args.email
      ? `KYC soumis pour ${args.email}`
      : `KYC soumis (utilisateur ${args.userId})`,
    userId: args.userId,
    metadata: { stripeSessionId: args.stripeSessionId },
  })
}

export async function createNewPaymentAdminAlertIfNew(args: {
  userId: string
  email: string | null
  plan: string
  amountLabel: string
  stripeSubscriptionId: string
}) {
  const existing = await prisma.adminAlert.findFirst({
    where: {
      type: 'NEW_PAYMENT',
      userId: args.userId,
      metadata: {
        path: ['stripeSubscriptionId'],
        equals: args.stripeSubscriptionId,
      },
    },
  })
  if (existing) return null

  const email = args.email ?? args.userId
  return createAdminAlert({
    type: 'NEW_PAYMENT',
    title: 'Nouveau subscriber',
    description: `${email} — plan ${args.plan} — ${args.amountLabel}`,
    userId: args.userId,
    metadata: {
      plan: args.plan,
      amountLabel: args.amountLabel,
      stripeSubscriptionId: args.stripeSubscriptionId,
    },
  })
}
