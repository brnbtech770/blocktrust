// proxy.ts (Next.js 16 — ex middleware.ts)
// Edge : www→apex + redirections admin/client (getToken) + garde API.
// Authentification pages : layouts + auth() Node (évite divergences JWT Edge / cookies chunkés).
// Le proxy reste un filet de sécurité Edge en amont : la défense en profondeur
// est assurée par les server components (auth() + redirect()).
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { isDashboardAdmin } from '@/app/lib/admin'

function inferSecureCookie(req: NextRequest): boolean {
  const proto = (req.headers.get('x-forwarded-proto') ?? '')
    .split(',')[0]?.trim()
  if (proto === 'https') return true
  if (req.nextUrl.protocol === 'https:') return true
  if (process.env.VERCEL === '1') return true
  return false
}

/** Cookie présent → seulement alors appeler getToken (évite blocage landing visiteurs anonymes). */
function hasAuthJsSessionCookieOnRequest(req: NextRequest): boolean {
  return req.cookies.getAll().some(
    (c) =>
      c.name === 'authjs.session-token' ||
      c.name === '__Secure-authjs.session-token' ||
      c.name.startsWith('authjs.session-token.') ||
      c.name.startsWith('__Secure-authjs.session-token.')
  )
}

async function getSessionToken(req: NextRequest): Promise<Record<string, unknown> | null> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) return null

  const primary = inferSecureCookie(req)
  let token = await getToken({ req, secret, secureCookie: primary })

  if (!token) {
    const other = await getToken({ req, secret, secureCookie: !primary })
    if (other) token = other
  }

  return (token as Record<string, unknown> | null) ?? null
}

async function getEmailFromSession(req: NextRequest): Promise<string | null> {
  const token = await getSessionToken(req)
  if (!token || token.sessionInvalid === true) return null
  return (token.email as string | undefined) ?? null
}

/**
 * Page publique `/verify` (+ ?certId=…, ?token=…).
 * `/verify/qr/…` : scan QR dynamique (token + contexte), public (rate limit côté page).
 * Autres sous-routes `/verify/[id]` → session requise (abonnés).
 */
function isProtectedVerifySubpath(pathname: string): boolean {
  if (pathname === '/verify' || pathname === '/verify/') return false
  if (pathname.startsWith('/verify/qr/')) return false
  if (pathname.startsWith('/verify/bis/')) return false
  return pathname.startsWith('/verify/')
}

/** Tunnel de paiement (/checkout/*) : session requise. */
function isProtectedCheckoutPath(pathname: string): boolean {
  return pathname === '/checkout' || pathname.startsWith('/checkout/')
}

/** Dashboard abonné — session requise (garde Edge, complète le layout). */
function isProtectedDashboardPath(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
}

function redirectToSignIn(request: NextRequest, pathname: string): NextResponse {
  const signInUrl = new URL('/auth/signin', request.url)
  signInUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(signInUrl)
}

function isProtectedApi(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) return false

  // Routes volontairement publiques ou auth alternative (clé API, cron, webhooks).
  if (pathname.startsWith('/api/public/')) return false
  if (pathname.startsWith('/api/auth/')) return false
  if (pathname.startsWith('/api/cron/')) return false
  if (pathname === '/api/health') return false
  if (pathname === '/api/pricing') return false
  if (pathname.startsWith('/api/badge/')) return false
  if (pathname === '/api/v2/verify' || pathname.startsWith('/api/v2/verify/')) return false
  if (pathname === '/api/verify/resolve-token') return false
  if (pathname === '/api/verify/link-qr') return false
  if (pathname.startsWith('/api/bis/verify')) return false
  if (pathname.includes('/webhook')) return false
  if (
    pathname === '/api/extension/me' ||
    pathname === '/api/extension/verify-sender' ||
    pathname === '/api/extension/add-contact' ||
    pathname === '/api/bis/sign'
  ) {
    return false
  }
  // QR image publique /api/qr/[id] — hors generate/settings (session).
  if (/^\/api\/qr\/[^/]+$/.test(pathname)) return false

  const protectedPrefixes = [
    '/api/certificates',
    '/api/contacts',
    '/api/entities',
    '/api/organization',
    '/api/vault',
    '/api/kyc',
    '/api/trust-circle',
    '/api/upload',
    '/api/whitelabel',
    '/api/user',
    '/api/quota',
    '/api/qr/generate',
    '/api/qr/settings',
    '/api/verify',
    '/api/bis/my-signatures',
    '/api/bis/received',
    '/api/extension/api-key',
    '/api/stats',
    '/api/activity',
  ]

  if (protectedPrefixes.some((prefix) => apiPathMatchesPrefix(pathname, prefix))) {
    return true
  }

  return pathname.startsWith('/api/stripe') && !pathname.includes('/webhook')
}

/** Préfixe API protégé — gère `/api/verify` et `/api/verify/…` sans double slash. */
function apiPathMatchesPrefix(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true
  const base = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  return pathname.startsWith(`${base}/`)
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Auth.js : /api/auth/* hors proxy (CSRF, OAuth, magic link) — ne pas modifier les requêtes.
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

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
      if (!email || !isDashboardAdmin(email)) {
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
      if (!email || !isDashboardAdmin(email)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch (error) {
      console.error('Proxy admin API guard:', error)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (isProtectedVerifySubpath(pathname) || isProtectedCheckoutPath(pathname)) {
    const signInRedirect = () => redirectToSignIn(request, pathname)
    try {
      const email = await getEmailFromSession(request)
      if (!email) {
        return signInRedirect()
      }
      return NextResponse.next()
    } catch (error) {
      // Fail-CLOSED : une erreur de vérification JWT sur une route protégée ne doit
      // JAMAIS laisser passer (le /verify public n'est pas un « protected subpath »).
      console.error('Proxy protected redirect:', error)
      return signInRedirect()
    }
  }

  if (isProtectedDashboardPath(pathname)) {
    try {
      const email = await getEmailFromSession(request)
      if (!email) {
        return redirectToSignIn(request, pathname)
      }
      return NextResponse.next()
    } catch (error) {
      console.error('Proxy dashboard guard:', error)
      return redirectToSignIn(request, pathname)
    }
  }

  // Admin connecté : landing uniquement → back-office (/dashboard/* reste accessible)
  if (pathname === '/') {
    if (hasAuthJsSessionCookieOnRequest(request)) {
      try {
        const email = await getEmailFromSession(request)
        if (email && isDashboardAdmin(email)) {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        }
      } catch (error) {
        console.error('Proxy admin redirect from home/dashboard:', error)
      }
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

    if (!email && isProtectedApi(pathname)) {
      if (
        isProtectedStripeApi &&
        pathname === '/api/stripe/create-checkout' &&
        request.method === 'GET'
      ) {
        const signInUrl = new URL('/auth/signin', request.url)
        signInUrl.searchParams.set(
          'callbackUrl',
          `${request.nextUrl.pathname}${request.nextUrl.search}`
        )
        return NextResponse.redirect(signInUrl)
      }
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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
  // /api/auth/* volontairement absent du matcher (MissingCSRF si intercepté / cookies altérés).
  matcher: [
    '/',
    '/dashboard',
    '/dashboard/:path*',
    '/admin',
    '/admin/:path*',
    '/verify',
    '/verify/:path*',
    '/checkout',
    '/checkout/:path*',
    '/api/debug-auth',
    '/api/certificates/:path*',
    '/api/contacts/:path*',
    '/api/entities/:path*',
    '/api/organization/:path*',
    '/api/vault/:path*',
    '/api/kyc/:path*',
    '/api/trust-circle/:path*',
    '/api/upload',
    '/api/whitelabel/:path*',
    '/api/user/:path*',
    '/api/quota/:path*',
    '/api/qr/generate/:path*',
    '/api/qr/settings/:path*',
    '/api/verify/:path*',
    '/api/bis/my-signatures',
    '/api/bis/received',
    '/api/extension/api-key',
    '/api/stripe/:path*',
    '/api/stats',
    '/api/activity',
    '/api/admin/:path*',
  ],
}
