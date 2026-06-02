/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
// app/api/admin/anchor-codebase/route.ts
// Admin : ancre sur Polygon Mainnet le hash de la version du code (preuve d'antériorité).
// Réutilise le mécanisme d'ancrage EXISTANT (lib/polygon → anchorToPolygon).
//
// Double protection (les deux obligatoires) :
//   1. admin authentifié (isAdmin / ADMIN_EMAILS via auth-server) ;
//   2. secret d'en-tête `x-anchor-secret` comparé en timing-safe à ANCHOR_TRIGGER_SECRET.
//
// Idempotence : un ancrage déjà enregistré (AdminAlert CERT_ANCHORED avec
// metadata.certificateId = `CODEBASE-${commit}` + txHash) n'est jamais ré-émis.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { anchorToPolygon, isPolygonConfigured } from '@/lib/polygon'
import { createAdminAlert } from '@/lib/admin-alerts'
import { timingSafeEqualString } from '@/lib/api-key'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  commit: z.string().regex(/^[0-9a-f]{7,64}$/i, 'commit hex invalide'),
  hash: z.string().regex(/^[0-9a-f]{64}$/i, 'hash SHA-256 hex invalide'),
})

function explorerUrlFor(txHash: string): string {
  return `https://polygonscan.com/tx/${txHash}`
}

export async function POST(req: NextRequest) {
  // Niveau 1 — admin authentifié
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Niveau 2 — secret d'en-tête. Refuse de tourner si non configuré.
  const triggerSecret = process.env.ANCHOR_TRIGGER_SECRET?.trim()
  if (!triggerSecret) {
    return NextResponse.json(
      { error: 'ANCHOR_TRIGGER_SECRET non configuré' },
      { status: 500 },
    )
  }
  const provided = req.headers.get('x-anchor-secret')
  if (!provided || !timingSafeEqualString(provided, triggerSecret)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isPolygonConfigured()) {
    return NextResponse.json({ error: 'Polygon non configuré' }, { status: 503 })
  }

  // Body { commit, hash }
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }
  const { commit, hash } = parsed.data
  const certificateId = `CODEBASE-${commit}`

  // Idempotence — un ancrage avec txHash existe-t-il déjà pour ce commit ?
  const existing = await prisma.adminAlert.findFirst({
    where: {
      type: 'CERT_ANCHORED',
      metadata: { path: ['certificateId'], equals: certificateId },
    },
    orderBy: { createdAt: 'desc' },
    select: { metadata: true },
  })
  if (existing?.metadata && typeof existing.metadata === 'object') {
    const meta = existing.metadata as Record<string, unknown>
    if (typeof meta.txHash === 'string' && meta.txHash.length > 0) {
      return NextResponse.json({
        alreadyAnchored: true,
        txHash: meta.txHash,
        explorerUrl: explorerUrlFor(meta.txHash),
      })
    }
  }

  try {
    const anchor = await anchorToPolygon(certificateId, hash)

    const metadata: Prisma.InputJsonObject = {
      certificateId,
      commit,
      hash,
      txHash: anchor.txHash,
      blockNumber: anchor.blockNumber,
      explorerUrl: anchor.explorerUrl,
      via: 'admin-anchor-codebase',
    }
    await createAdminAlert({
      type: 'CERT_ANCHORED',
      title: "Code source ancré sur Polygon (preuve d'antériorité)",
      description: `TX: ${anchor.txHash} — bloc #${anchor.blockNumber}`,
      metadata,
    }).catch(() => undefined)

    return NextResponse.json({
      txHash: anchor.txHash,
      explorerUrl: explorerUrlFor(anchor.txHash),
    })
  } catch {
    // Message générique : ne jamais fuiter la clé privée ni le RPC URL.
    console.error('[anchor-codebase] échec ancrage Polygon')
    return NextResponse.json({ error: 'Ancrage échoué' }, { status: 500 })
  }
}
