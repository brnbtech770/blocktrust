/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * GET /api/bis/my-signatures — signatures BIS émises (paginé)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [items, total] = await Promise.all([
    prisma.interactionSignature.findMany({
      where: { senderId: session.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        recipientEmail: true,
        interactionType: true,
        contextLabel: true,
        contentHash: true,
        bisLevel: true,
        verified: true,
        verifiedAt: true,
        createdAt: true,
        expiresAt: true,
        signature: true,
      },
    }),
    prisma.interactionSignature.count({
      where: { senderId: session.user.id },
    }),
  ])

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://blocktrust.tech'
  ).replace(/\/$/, '')

  return NextResponse.json({
    items: items.map((row) => ({
      ...row,
      verifyUrl: `${baseUrl}/verify/bis/${row.id}`,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
    })),
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  })
}
