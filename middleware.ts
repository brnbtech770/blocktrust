// middleware.ts
// Edge-compatible : session via getToken() (next-auth/jwt)
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isAdmin } from '@/app/lib/admin'

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

  try {
    const email = await getEmailFromSession(request)

    // ─── LANDING PAGE : admin → /admin ───
    if (pathname === '/') {
      if (email && isAdmin(email)) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return NextResponse.next()
    }

    // ─── PROTECTION ROUTES ADMIN ───
    if (pathname.startsWith('/admin')) {
      if (!email) {
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set(
          'callbackUrl',
          `${request.nextUrl.pathname}${request.nextUrl.search}`
        )
        return NextResponse.redirect(signInUrl)
      }
      if (!isAdmin(email)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      return NextResponse.next()
    }

    // ─── PROTECTION ROUTES DASHBOARD ───
    // Les comptes admin (ex. brnbtech) ont aussi un espace client : ne pas tout envoyer vers /admin.
    if (pathname.startsWith('/dashboard')) {
      if (!email) {
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set(
          'callbackUrl',
          `${request.nextUrl.pathname}${request.nextUrl.search}`
        )
        return NextResponse.redirect(signInUrl)
      }
      return NextResponse.next()
    }

    // ─── PROTECTION ROUTES API ───
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
    const isProtectedPage =
      pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
    const isProtectedApi =
      pathname.startsWith('/api/certificates') ||
      pathname.startsWith('/api/entities') ||
      pathname.startsWith('/api/stripe') ||
      pathname === '/api/stats' ||
      pathname === '/api/activity'

    if (isProtectedApi) {
      return NextResponse.json(
        { error: 'Service temporairement indisponible' },
        { status: 503 }
      )
    }
    if (isProtectedPage) {
      return new NextResponse('Service temporairement indisponible', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    return NextResponse.next()
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
