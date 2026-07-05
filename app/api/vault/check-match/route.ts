// app/api/vault/check-match/route.ts
// Correspondance coffre pour l’utilisateur connecté (page /verify)
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { z } from 'zod'
import { checkVaultMatchForUserContacts } from '@/lib/vault-utils'
import { vaultRateLimitResponse } from '@/lib/vault-api-utils'

const bodySchema = z.object({
  emails: z.array(z.string()).optional(),
  domains: z.array(z.string()).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const rl = await vaultRateLimitResponse(session.user.id)
  if (rl) return rl

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const result = await checkVaultMatchForUserContacts({
    userId: session.user.id,
    emails: parsed.data.emails,
    domains: parsed.data.domains,
  })

  if (result === null) {
    return NextResponse.json({ inOrganization: false, match: false })
  }

  return NextResponse.json(result)
}
