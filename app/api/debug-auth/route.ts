import { NextResponse } from 'next/server'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/app/lib/db'

export async function GET() {
  const adapter = PrismaAdapter(prisma) as any
  const results: Record<string, any> = {}

  for (const email of ['brnbtech@gmail.com', 'brnbimmo@gmail.com']) {
    const account = await prisma.account.findFirst({
      where: { provider: 'google', user: { email } },
    })

    let userByAccount = null
    let userByEmail = null
    let error = null

    try {
      if (account) {
        userByAccount = await adapter.getUserByAccount({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        })
      }
    } catch (e) {
      error = String(e)
    }

    try {
      userByEmail = await adapter.getUserByEmail(email)
    } catch (e) {
      error = (error || '') + ' | getUserByEmail: ' + String(e)
    }

    results[email] = {
      accountExists: !!account,
      accountUserId: account?.userId,
      accountProviderAccountId: account?.providerAccountId,
      userByAccount: userByAccount ? { id: userByAccount.id, email: userByAccount.email } : null,
      userByEmail: userByEmail ? { id: userByEmail.id, email: userByEmail.email } : null,
      sameUser: userByAccount?.id === userByEmail?.id,
      wouldCauseOAuthAccountNotLinked: userByEmail && !userByAccount,
      error,
    }
  }

  return NextResponse.json(results, { status: 200 })
}
