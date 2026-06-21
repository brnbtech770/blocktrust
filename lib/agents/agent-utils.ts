// lib/agents/agent-utils.ts
// Utilitaires partagés pour les agents de surveillance BLOCKTRUST
// ============================================================

import { prisma } from '@/app/lib/db'
import { createAdminAlert } from '@/lib/admin-alerts'
import { sendEmailFireAndForget } from '@/lib/email'
import type { Prisma } from '@prisma/client'
import * as React from 'react'
import { Body, Html, Text } from '@react-email/components'

export const SECURITY_EMAIL = 'security@blocktrust.tech'

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    'https://blocktrust.tech'
  )
}

type MetadataPathFilter = { path: string[]; equals: string }

export async function recentAgentAlertExists(
  type: string,
  metadataMatch: MetadataPathFilter,
  since: Date,
): Promise<boolean> {
  const found = await prisma.adminAlert.findFirst({
    where: {
      type,
      createdAt: { gte: since },
      metadata: metadataMatch,
    },
    select: { id: true },
  })
  return Boolean(found)
}

export async function writeAgentAuditLog(
  action: string,
  resourceId: string,
  newValue: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        action,
        resource: 'agent',
        resourceId,
        newValue: {
          finishedAt: new Date().toISOString(),
          ...newValue,
        } as Prisma.InputJsonValue,
      },
    })
    .catch(() => null)
}

export async function getLastAgentRunAt(resourceId: string, action: string): Promise<Date | null> {
  const row = await prisma.auditLog.findFirst({
    where: { action, resource: 'agent', resourceId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  return row?.createdAt ?? null
}

export async function shouldRunAgent(
  resourceId: string,
  action: string,
  minIntervalMs: number,
): Promise<boolean> {
  const last = await getLastAgentRunAt(resourceId, action)
  if (!last) return true
  return Date.now() - last.getTime() >= minIntervalMs
}

function SecurityTeamAlertEmail({ detail }: { detail: string }) {
  return React.createElement(
    Html,
    null,
    React.createElement(
      Body,
      { style: { fontFamily: 'Inter, sans-serif', padding: 24 } },
      React.createElement(Text, { style: { fontSize: 16, fontWeight: 600 } }, 'Alerte BLOCKTRUST™'),
      React.createElement(Text, { style: { fontSize: 14 } }, detail),
      React.createElement(Text, { style: { fontSize: 12, color: '#666' } }, appBaseUrl()),
    ),
  )
}

export function notifySecurityTeam(detail: string): void {
  sendEmailFireAndForget({
    to: SECURITY_EMAIL,
    subject: 'Alerte sécurité BLOCKTRUST™',
    react: React.createElement(SecurityTeamAlertEmail, { detail }),
  })
}

export async function createSecurityAdminAlert(args: {
  title: string
  description: string
  entityId?: string
  userId?: string
  metadata?: Record<string, unknown>
  notifyTeam?: boolean
}): Promise<void> {
  await createAdminAlert({
    type: 'SECURITY',
    title: args.title,
    description: args.description,
    entityId: args.entityId,
    userId: args.userId,
    metadata: args.metadata,
  }).catch(() => null)

  if (args.notifyTeam !== false) {
    notifySecurityTeam(args.description)
  }
}

export async function createFraudAdminAlert(args: {
  title: string
  description: string
  entityId?: string
  userId?: string
  metadata?: Record<string, unknown>
  decrementTrustScoreUserId?: string
}): Promise<void> {
  await createAdminAlert({
    type: 'FRAUD_ALERT',
    title: args.title,
    description: args.description,
    entityId: args.entityId,
    userId: args.userId,
    metadata: args.metadata,
  }).catch(() => null)

  notifySecurityTeam(args.description)

  if (args.decrementTrustScoreUserId) {
    const current = await prisma.user
      .findUnique({
        where: { id: args.decrementTrustScoreUserId },
        select: { trustScore: true },
      })
      .catch(() => null)

    if (current) {
      const nextScore = Math.max(0, (current.trustScore ?? 0) - 10)
      await prisma.user
        .update({
          where: { id: args.decrementTrustScoreUserId },
          data: {
            trustScore: nextScore,
            trustScoreAt: new Date(),
          },
        })
        .catch(() => null)
    }
  }

  await prisma.auditLog
    .create({
      data: {
        action: 'FRAUD_AGENT_ALERT',
        resource: 'agent',
        resourceId: 'fraud-surveillance',
        userId: args.decrementTrustScoreUserId,
        entityId: args.entityId,
        newValue: {
          title: args.title,
          description: args.description,
        } as Prisma.InputJsonValue,
      },
    })
    .catch(() => null)
}

export async function recentAuditLogExists(
  action: string,
  resourceId: string,
  since: Date,
): Promise<boolean> {
  const found = await prisma.auditLog.findFirst({
    where: {
      action,
      resourceId,
      createdAt: { gte: since },
    },
    select: { id: true },
  })
  return Boolean(found)
}
