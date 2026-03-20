// middleware.ts
// Edge : www→apex + garde API (getToken). Pages /dashboard et /admin : auth via layouts + auth() Node uniquement
// (évite divergences JWT Edge vs Node / cookies chunkés).
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

function inferSecureCookie(req: NextRequest): boolean {
  const proto = (req.headers.get('x-forwarded-proto') ?? '')
    .split(',')[0]?.trim()
  if (proto === 'https') return true
  if (req.nextUrl.protocol === 'https:') return true
  if (process.env.VERCEL === '1') return true
  return false
}

async function getEmailFromSession(req: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!secret) return null

  const primary = inferSecureCookie(req)
  let token = await getToken({ req, secret, secureCookie: primary })

  if (!token?.email) {
    const other = await getToken({ req, secret, secureCookie: !primary })
    if (other?.email) token = other
  }

  return (token?.email as string | undefined) ?? null
}

function isProtectedApi(pathname: string): boolean {
  const isProtectedStripeApi =
    pathname.startsWith('/api/stripe') && !pathname.includes('/webhook')
  return (
    pathname.startsWith('/api/certificates') ||
    pathname.startsWith('/api/entities') ||
    pathname === '/api/stats' ||
    pathname === '/api/activity' ||
    isProtectedStripeApi
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ─── www → apex redirect ───
  let canonicalHost: string | null = null
  const base = process.env.NEXTAUTH_URL || process.env.AUTH_URL
  try {
    if (base) canonicalHost = new URL(base).hostname.toLowerCase()
  } catch {
    canonicalHost = null
  }
  if (canonicalHost) {
    const rawHost = request.headers.get('host') ?? ''
    const host = rawHost.split(':')[0].toLowerCase()
    if (host === `www.${canonicalHost}`) {
      const url = request.nextUrl.clone()
      url.hostname = canonicalHost
      return NextResponse.redirect(url, 308)
    }
  }

  // Pages (/, /dashboard/*, /admin/*) : pas de getToken ici — évite faux « non connecté » vs auth().
  if (!isProtectedApi(pathname)) {
    return NextResponse.next()
  }

  try {
    const email = await getEmailFromSession(request)

    const isProtectedStripeApi =
      pathname.startsWith('/api/stripe') && !pathname.includes('/webhook')

    if (
      isProtectedStripeApi &&
      pathname === '/api/stripe/create-checkout' &&
      request.method === 'GET' &&
      !email
    ) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set(
        'callbackUrl',
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      )
      return NextResponse.redirect(signInUrl)
    }

    if (
      pathname.startsWith('/api/certificates') ||
      pathname.startsWith('/api/entities') ||
      pathname === '/api/stats' ||
      pathname === '/api/activity' ||
      isProtectedStripeApi
    ) {
      if (!email) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    return NextResponse.next()
  } catch (error) {
    console.error('❌ Middleware error:', error)
    return NextResponse.json(
      { error: 'Service temporairement indisponible' },
      { status: 503 }
    )
  }
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/certificates/:path*',
    '/api/entities/:path*',
    '/api/stripe/:path*',
    '/api/stats',
    '/api/activity',
  ],
}
