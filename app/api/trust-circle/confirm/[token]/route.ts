import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { token } = await params

  const relation = await prisma.userTrustRelation.findFirst({
    where: { inviteToken: token },
  })

  if (!relation) {
    return NextResponse.json(
      { error: 'Invitation introuvable' },
      { status: 404 }
    )
  }

  if (relation.inviteExpiry && relation.inviteExpiry < new Date()) {
    return NextResponse.json(
      { error: 'Invitation expirée' },
      { status: 410 }
    )
  }

  if (relation.toUserId !== session.user.id) {
    return NextResponse.json(
      { error: 'Non autorisé' },
      { status: 403 }
    )
  }

  await prisma.userTrustRelation.update({
    where: { id: relation.id },
    data: {
      status:    'CONFIRMED',
      confirmedAt: new Date(),
      trustType: 'UNILATERAL',
    },
  })

  const reverse = await prisma.userTrustRelation.findFirst({
    where: {
      fromUserId: session.user.id,
      toUserId:   relation.fromUserId,
    },
  })

  if (reverse?.status === 'CONFIRMED') {
    await prisma.$transaction([
      prisma.userTrustRelation.update({
        where: { id: relation.id },
        data: { isMutual: true, trustType: 'MUTUAL' },
      }),
      prisma.userTrustRelation.update({
        where: { id: reverse.id },
        data: { isMutual: true, trustType: 'MUTUAL' },
      }),
    ])
    const { sendMutualTrustEmail } = await import('@/lib/trust-circle-email')
    sendMutualTrustEmail(session.user.id, relation.fromUserId).catch(console.error)
    return NextResponse.json({
      success:   true,
      trustType: 'MUTUAL',
      message:   'Confiance mutuelle activée !',
    })
  }

  return NextResponse.json({
    success:    true,
    trustType:  'UNILATERAL',
    message:    'Relation confirmée. Voulez-vous également ajouter cet utilisateur à votre Trust Circle ?',
    addBackUrl: `/dashboard/trust-circle?addBack=${relation.fromUserId}`,
  })
}
