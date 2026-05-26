import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { BIOMETRIC_CONSENT_VERSION } from '@/lib/biometric-consent'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      biometricConsentAt: true,
      biometricConsentVersion: true,
    },
  })

  return NextResponse.json({
    hasConsent: Boolean(user?.biometricConsentAt),
    consentAt: user?.biometricConsentAt?.toISOString() ?? null,
    version: user?.biometricConsentVersion ?? null,
  })
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      biometricConsentAt: new Date(),
      biometricConsentVersion: BIOMETRIC_CONSENT_VERSION,
    },
  })

  return NextResponse.json({
    ok: true,
    version: BIOMETRIC_CONSENT_VERSION,
  })
}
