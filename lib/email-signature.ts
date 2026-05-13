// lib/email-signature.ts
// Certificat « signature » pour emails (dernier certificat actif / ancré du compte)
// ============================================================

import { prisma } from '@/app/lib/db'
import { buildPublicVerifyUrl } from '@/lib/public-verify-url'

export async function getUserEmailSignature(userId: string): Promise<{
  senderName: string
  certId: string | null
  verifyUrl: string | null
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })

    if (!user) {
      return {
        senderName: 'Utilisateur BLOCKTRUST',
        certId: null,
        verifyUrl: null,
      }
    }

    const cert = await prisma.certificate.findFirst({
      where: {
        entity: { userId },
        status: { in: ['ACTIVE', 'ANCHORED'] },
      },
      orderBy: { issuedAt: 'desc' },
      select: { publicId: true, id: true },
    })

    const certId = cert?.publicId ?? cert?.id ?? null
    const verifyUrl = certId ? buildPublicVerifyUrl(certId) : null

    return {
      senderName: user.name?.trim() || 'Utilisateur BLOCKTRUST',
      certId,
      verifyUrl,
    }
  } catch {
    return {
      senderName: 'Utilisateur BLOCKTRUST',
      certId: null,
      verifyUrl: null,
    }
  }
}
