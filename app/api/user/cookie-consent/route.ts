// app/api/user/cookie-consent/route.ts
// Enregistre le choix cookies (RGPD) pour les utilisateurs connectés
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { sameOriginMutationResponse } from '@/lib/csrf-origin-guard'

const bodySchema = z
  .object({
    accepted: z.boolean(),
  })
  .strict()

export async function PATCH(req: NextRequest) {
  const csrf = sameOriginMutationResponse(req)
  if (csrf) return csrf

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true })
  }

  const { accepted } = parsed.data
  const now = new Date()

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      cookieConsent: accepted,
      cookieConsentAt: now,
    },
  })

  return NextResponse.json({ ok: true })
}
