// app/api/qr/[id]/route.ts
// Génère un QR code pour un certificat
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import QRCode from 'qrcode'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id
    const format = req.nextUrl.searchParams.get('format') || 'png' // png, svg, jpeg

    // Chercher le certificat
    let certificate = await prisma.certificate.findUnique({
      where: { publicId: id },
      include: { entity: true },
    })

    if (!certificate) {
      certificate = await prisma.certificate.findUnique({
        where: { id },
        include: { entity: true },
      })
    }

    if (!certificate) {
      return new NextResponse('Certificat non trouvé', { status: 404 })
    }

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify/${certificate.publicId || certificate.id}`

    // Générer le QR code selon le format demandé
    if (format === 'svg') {
      const svg = await QRCode.toString(verifyUrl, {
        type: 'svg',
        width: 300,
        margin: 1,
      })

      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } else {
      // PNG (toBuffer ne supporte que type 'png')
      const buffer = await QRCode.toBuffer(verifyUrl, {
        width: 300,
        margin: 1,
        type: 'png',
      })

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': format === 'jpeg' ? 'image/jpeg' : 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
  } catch (error: any) {
    console.error('❌ QR code generation error:', error)
    return new NextResponse('Erreur génération QR code', { status: 500 })
  }
}
