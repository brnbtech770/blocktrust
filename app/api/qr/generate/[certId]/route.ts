// app/api/qr/generate/[certId]/route.ts
// POST — Génère ou renouvelle le QR dynamique pour un certificat
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { generateQrDynamicToken } from '@/lib/qr-dynamic-token'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { certId } = await params

    const certIdParsed = z.string().cuid().safeParse(certId)
    if (!certIdParsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        id: certIdParsed.data,
        entity: { userId: session.user.id },
      },
      select: { id: true },
    })
    if (!certificate) {
      return NextResponse.json({ error: 'Certificat non trouvé' }, { status: 404 })
    }

    const signature = await prisma.signature.findFirst({
      where: {
        certificateId: certIdParsed.data,
        revoked: false,
      },
      orderBy: { issuedAt: 'desc' },
    })

    if (!signature) {
      return NextResponse.json({ error: 'Aucune signature valide pour ce certificat' }, { status: 404 })
    }

    const dynamicToken = generateQrDynamicToken()
    const tokenExpiry = new Date(Date.now() + 24 * 3600 * 1000)

    await prisma.signature.update({
      where: { id: signature.id },
      data: {
        dynamicToken,
        tokenExpiry,
      },
    })

    const verifyUrl =
      signature.contextHash != null
        ? `${baseUrl}/verify/qr/${dynamicToken}?h=${signature.contextHash}`
        : `${baseUrl}/verify/qr/${dynamicToken}`

    return NextResponse.json({ verifyUrl, dynamicToken, tokenExpiry: tokenExpiry.toISOString() })
  } catch (error) {
    console.error('❌ QR generate error:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du QR' }, { status: 500 })
  }
}
