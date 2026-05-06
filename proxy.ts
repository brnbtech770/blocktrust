// proxy.ts (Next.js 16 — ex middleware.ts)
// Edge : www→apex + redirections admin/client (getToken) + garde API.
// Authentification pages : layouts + auth() Node (évite divergences JWT Edge / cookies chunkés).
// Le proxy reste un filet de sécurité Edge en amont : la défense en profondeur
// est assurée par les server components (auth() + redirect()).
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

/**
 * Page publique `/verify` (+ ?token=…). Sous-routes `/verify/[id]`, `/verify/qr/…` → session requise (abonnés).
 */
function isProtectedVerifySubpath(pathname: string): boolean {
  if (pathname === '/verify' || pathname === '/verify/') return false
  return pathname.startsWith('/verify/')
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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Défense en profondeur : ne jamais exposer l’ancienne route de diagnostic auth en prod.
  if (
    pathname === '/api/debug-auth' ||
    pathname.startsWith('/api/debug-auth/')
  ) {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

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

  // ─── Protection stricte : toutes les routes /admin (JWT Edge : email session)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    try {
      const email = await getEmailFromSession(request)
      if (!email || !isAdmin(email)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error) {
      console.error('Proxy admin guard:', error)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // ─── Protection stricte : toutes les API /api/admin/*
  if (pathname.startsWith('/api/admin')) {
    try {
      const email = await getEmailFromSession(request)
      if (!email || !isAdmin(email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch (error) {
      console.error('Proxy admin API guard:', error)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (isProtectedVerifySubpath(pathname)) {
    try {
      const email = await getEmailFromSession(request)
      if (!email) {
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set(
          'callbackUrl',
          `${pathname}${request.nextUrl.search}`
        )
        return NextResponse.redirect(signInUrl)
      }
    } catch (error) {
      console.error('Proxy verify redirect:', error)
    }
    return NextResponse.next()
  }

  // Admin connecté : racine /dashboard → back-office
  if (pathname === '/dashboard') {
    try {
      const email = await getEmailFromSession(request)
      if (email && isAdmin(email)) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    } catch (error) {
      console.error('Proxy admin redirect from dashboard:', error)
    }
  }

  // Pages (/, /dashboard/*, /admin/*) hors garde ci-dessus : pas de getToken pour le reste — évite faux « non connecté » vs auth().
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
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Service temporairement indisponible' },
      { status: 503 }
    )
  }
}

export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/dashboard/:path*',
    '/admin',
    '/admin/:path*',
    '/verify',
    '/verify/:path*',
    '/api/debug-auth',
    '/api/certificates/:path*',
    '/api/entities/:path*',
    '/api/stripe/:path*',
    '/api/stats',
    '/api/activity',
    '/api/admin/:path*',
  ],
}
