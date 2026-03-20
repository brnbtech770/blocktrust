import { NextRequest, NextResponse } from 'next/server'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'

export async function GET(req: NextRequest) {
  const adapter = PrismaAdapter(prisma) as any

  // 1. Session state
  let sessionInfo: any = null
  try {
    const session = await auth()
    sessionInfo = session
      ? {
          userId: session.user?.id ?? '(empty)',
          email: session.user?.email ?? '(empty)',
          name: session.user?.name ?? '(empty)',
          plan: (session.user as any)?.plan ?? '(empty)',
          kycStatus: (session.user as any)?.kycStatus ?? '(empty)',
        }
      : null
  } catch (e) {
    sessionInfo = { error: String(e) }
  }

  // 2. Cookies present
  const cookies = {
    'authjs.session-token': !!req.cookies.get('authjs.session-token')?.value,
    '__Secure-authjs.session-token': !!req.cookies.get('__Secure-authjs.session-token')?.value,
    'authjs.callback-url': req.cookies.get('authjs.callback-url')?.value ?? null,
    'authjs.csrf-token': !!req.cookies.get('authjs.csrf-token')?.value,
    '__Secure-authjs.csrf-token': !!req.cookies.get('__Secure-authjs.csrf-token')?.value,
    '__Host-authjs.csrf-token': !!req.cookies.get('__Host-authjs.csrf-token')?.value,
  }

  // 3. Env vars check (existence only, not values)
  const envCheck = {
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? '(not set)',
    AUTH_URL: process.env.AUTH_URL ?? '(not set)',
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? '(not set)',
  }

  // 4. DB accounts check
  const accounts: Record<string, any> = {}
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

    accounts[email] = {
      accountExists: !!account,
      accountUserId: account?.userId,
      userByAccount: userByAccount ? { id: userByAccount.id, email: userByAccount.email } : null,
      userByEmail: userByEmail ? { id: userByEmail.id, email: userByEmail.email } : null,
      sameUser: userByAccount?.id === userByEmail?.id,
      wouldCauseOAuthAccountNotLinked: userByEmail && !userByAccount,
      error,
    }
  }

  // 5. Request info
  const requestInfo = {
    host: req.headers.get('host'),
    'x-forwarded-host': req.headers.get('x-forwarded-host'),
    'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
    url: req.url,
  }

  return NextResponse.json(
    { session: sessionInfo, cookies, env: envCheck, accounts, request: requestInfo },
    { status: 200 }
  )
}
