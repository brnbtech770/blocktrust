// app/api/qr/settings/[certId]/route.ts
// PATCH — Met à jour maxScans pour le QR dynamique du certificat
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'

const bodySchema = z.object({
  maxScans: z.number().int().min(1).max(999999).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const { certId } = await params
    const certificate = await prisma.certificate.findFirst({
      where: {
        id: certId,
        entity: { userId: user.id },
      },
      select: { id: true },
    })
    if (!certificate) {
      return NextResponse.json({ error: 'Certificat non trouvé' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const { maxScans } = parsed.data
    if (maxScans == null) {
      return NextResponse.json({ error: 'maxScans requis' }, { status: 400 })
    }

    await prisma.signature.updateMany({
      where: { certificateId: certId, revoked: false },
      data: { maxScans },
    })

    return NextResponse.json({ success: true, maxScans })
  } catch (error) {
    console.error('❌ QR settings error:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
