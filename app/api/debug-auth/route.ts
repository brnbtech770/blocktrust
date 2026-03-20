import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { authEnvShim } from '@/app/lib/auth-env-shim'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const adapter = PrismaAdapter(prisma) as any

  // 1. Session state (Session explicite : ReturnType<typeof auth> peut être mal inféré sur next-auth beta)
  let session: Session | null  = null
  let sessionInfo: any = null
  try {
    session = await auth()
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

  const allJar = req.cookies.getAll()
  const sessionCookieHints = allJar.filter(
    (c) =>
      c.name === 'authjs.session-token' ||
      c.name === '__Secure-authjs.session-token' ||
      c.name.startsWith('authjs.session-token.') ||
      c.name.startsWith('__Secure-authjs.session-token.')
  )
  const hasSession = !!session?.user?.email
  const hasSessionCookie = sessionCookieHints.length > 0
  const rawCookie = req.headers.get('cookie') ?? ''
  const cookieHeaderLen = rawCookie.length
  const nextPrefetch =
    req.headers.get('Next-Router-Prefetch') === '1' ||
    req.headers.get('next-router-prefetch') === '1'
  const secPurpose = req.headers.get('sec-purpose') ?? req.headers.get('Sec-Purpose') ?? ''
  const layoutDiagnostic = {
    sessionId: '467f2c',
    hypothesisId: 'H2',
    message: 'parity with app/dashboard/layout.tsx auth probe',
    data: {
      hasSession,
      hasSessionCookie,
      sessionCookieCount: sessionCookieHints.length,
      mismatchCookieWithoutSession: hasSessionCookie && !hasSession,
      cookieHeaderLen,
      nextPrefetch,
      secPurposePrefix: secPurpose ? secPurpose.slice(0, 24) : '',
    },
    timestamp: Date.now(),
    runId: 'debug-auth-get',
  }

  // 2. Cookies present (+ indices chunk session JWT > 4ko)
  const cookies = {
    'authjs.session-token': !!req.cookies.get('authjs.session-token')?.value,
    '__Secure-authjs.session-token': !!req.cookies.get('__Secure-authjs.session-token')?.value,
    sessionTokenChunked: /\.session-token\.\d+=/.test(rawCookie),
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

  let hostVsNextAuth: {
    aligned: boolean
    requestHost: string | null
    nextAuthHostname: string | null
    hint: string | null
  } = {
    aligned: true,
    requestHost: null,
    nextAuthHostname: null,
    hint: null,
  }
  try {
    const rawHost = req.headers.get('host')
    const requestHost = rawHost?.split(':')[0] ?? null
    const na = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL) : null
    const nextAuthHostname = na?.hostname ?? null
    const aligned = !!(
      requestHost &&
      nextAuthHostname &&
      requestHost.toLowerCase() === nextAuthHostname.toLowerCase()
    )
    hostVsNextAuth = {
      aligned,
      requestHost,
      nextAuthHostname,
      hint: aligned
        ? null
        : 'Host requête ≠ hostname NEXTAUTH_URL → risque de cookies/session (www vs apex, alias domaine).',
    }
  } catch {
    hostVsNextAuth.hint = 'NEXTAUTH_URL illisible pour comparaison host.'
  }

  /** Sonde JWT brute (même décode que la session) — longueurs uniquement, pas d’email en clair. */
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  const secureFromEnv =
    (process.env.NEXTAUTH_URL ?? '').startsWith('https://') ||
    (process.env.AUTH_URL ?? '').startsWith('https://')
  type JwtProbe = {
    secureCookie: boolean
    decoded: boolean
    subLen: number
    emailLen: number
    exp: number | null
  }
  async function probeJwt(secureCookie: boolean): Promise<JwtProbe | null> {
    if (!secret) return null
    try {
      const t = await getToken({ req, secret, secureCookie })
      if (!t) {
        return {
          secureCookie,
          decoded: false,
          subLen: 0,
          emailLen: 0,
          exp: null,
        }
      }
      return {
        secureCookie,
        decoded: true,
        subLen: t.sub ? String(t.sub).length : 0,
        emailLen: typeof t.email === 'string' ? t.email.length : 0,
        exp: typeof t.exp === 'number' ? t.exp : null,
      }
    } catch {
      return {
        secureCookie,
        decoded: false,
        subLen: 0,
        emailLen: 0,
        exp: null,
      }
    }
  }

  const jwtPrimary = await probeJwt(secureFromEnv)
  const jwtFallback =
    jwtPrimary && !jwtPrimary.decoded && hasSessionCookie
      ? await probeJwt(!secureFromEnv)
      : null

  let jwtHint: string | null = null
  if (hasSessionCookie && jwtPrimary && !jwtPrimary.decoded) {
    if (jwtFallback?.decoded) {
      jwtHint =
        'Cookie présent mais décodable seulement avec secureCookie alternatif → vérifier NEXTAUTH_URL / AUTH_URL (http vs https) vs préfixe __Secure- du cookie.'
    } else {
      jwtHint =
        'Cookie session présent mais JWT illisible (secret erroné, cookie corrompu, ou chunk incomplet).'
    }
  }
  if (
    jwtPrimary?.decoded &&
    jwtPrimary.emailLen === 0 &&
    (jwtPrimary.subLen ?? 0) > 0
  ) {
    jwtHint =
      'JWT décodé avec sub mais sans email → regarder callbacks jwt OAuth / merge session.'
  }
  if (jwtPrimary?.decoded && jwtPrimary.emailLen > 0 && !session?.user?.email) {
    jwtHint =
      'JWT contient un email (longueur > 0) mais auth() ne retourne pas session.user.email → session callback ou typage session.'
  }

  const rhLow = hostVsNextAuth.requestHost?.toLowerCase() ?? ''
  const nhLow = hostVsNextAuth.nextAuthHostname?.toLowerCase() ?? ''
  const wwwVsCanonical = {
    isWwwOfCanonical: Boolean(nhLow && rhLow === `www.${nhLow}`),
    hint: null as string | null,
  }
  if (wwwVsCanonical.isWwwOfCanonical) {
    wwwVsCanonical.hint =
      'Host = www.* alors que NEXTAUTH_URL est en apex : risque de cookies session sur le mauvais host. Utiliser l’URL sans www ou déployer le middleware de redirection www→apex.'
  }

  return NextResponse.json(
    {
      debugAuthVersion: 7,
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      authEnvShim,
      runtimeAuthSecretPresent: !!process.env.AUTH_SECRET,
      hostVsNextAuth,
      session: sessionInfo,
      layoutDiagnostic,
      jwtFromCookie: {
        secureFromEnv,
        primary: jwtPrimary,
        fallbackAlternateSecure: jwtFallback,
        jwtHint,
      },
      cookies,
      env: envCheck,
      accounts,
      request: requestInfo,
      wwwVsCanonical,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      },
    }
  )
}
