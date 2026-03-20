// middleware.ts
// Edge-compatible middleware — no Prisma, no node:crypto
// Decodes the NextAuth JWT from the session cookie using `jose`
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtDecrypt } from 'jose'

const ADMIN_EMAILS = [
  'brnbtech@gmail.com',
  'laurianne@blocktrust.tech',
]

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Decode the NextAuth v5 session JWT from the cookie.
 * Returns the token payload or null if absent/invalid.
 */
async function getTokenFromCookie(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return null

  // NextAuth v5 cookie name: __Secure-authjs.session-token (prod) or authjs.session-token (dev)
  const cookieName =
    req.cookies.get('__Secure-authjs.session-token')?.value
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token'
  const token = req.cookies.get(cookieName)?.value
  if (!token) return null

  try {
    const encryptionKey = await deriveKey(secret)
    const { payload } = await jwtDecrypt(token, encryptionKey, {
      clockTolerance: 15,
    })
    return payload as { sub?: string; email?: string; kycStatus?: string; accountType?: string }
  } catch {
    return null
  }
}

/** Derive the same encryption key NextAuth uses (HKDF with SHA-256). */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HKDF' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(''),
      info: encoder.encode('Auth.js Generated Encryption Key'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ─────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  try {
    const token = await getTokenFromCookie(request)
    const email = token?.email ?? null

    // ─────────────────────────────────────────────
    // LANDING PAGE : admin connecté → /admin
    // ─────────────────────────────────────────────
    if (pathname === '/') {
      if (email && isAdmin(email)) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      // Landing : pas de redirection vers /pricing ni vers le dashboard
      return NextResponse.next()
    }

    // ─────────────────────────────────────────────
    // PROTECTION ROUTES ADMIN
    // ─────────────────────────────────────────────
    if (pathname.startsWith('/admin')) {
      if (!email) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
      if (!isAdmin(email)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      return NextResponse.next()
    }

    // ─────────────────────────────────────────────
    // PROTECTION ROUTES DASHBOARD + CHECK KYC
    // ─────────────────────────────────────────────
    if (pathname.startsWith('/dashboard')) {
      if (!email) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
      if (isAdmin(email)) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }

      // KYC informatif uniquement — ne bloque plus l'accès au dashboard
      return NextResponse.next()
    }

    // ─────────────────────────────────────────────
    // PROTECTION ROUTES API
    // ─────────────────────────────────────────────
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
