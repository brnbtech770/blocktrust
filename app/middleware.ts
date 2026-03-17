// app/middleware.ts
// Middleware pour protéger les routes admin et rediriger les admins
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  try {
    const session = await auth()
    
    // ─────────────────────────────────────────────
    // PROTECTION ROUTES ADMIN
    // ─────────────────────────────────────────────
    if (pathname.startsWith('/admin')) {
      if (!session?.user?.email) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }

      if (!isAdmin(session.user.email)) {
        // Pas admin, rediriger vers le dashboard client
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Admin autorisé, continuer
      return NextResponse.next()
    }

    // ─────────────────────────────────────────────
    // PROTECTION ROUTES DASHBOARD
    // ─────────────────────────────────────────────
    if (pathname.startsWith('/dashboard')) {
      if (!session?.user?.email) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }

      if (isAdmin(session.user.email)) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return NextResponse.next()
    }

    // ─────────────────────────────────────────────
    // PROTECTION ROUTES API (sauf webhook Stripe)
    // ─────────────────────────────────────────────
    if (
      pathname.startsWith('/api/certificates') ||
      pathname.startsWith('/api/entities') ||
      pathname === '/api/stats' ||
      pathname === '/api/activity' ||
      (pathname.startsWith('/api/stripe') && !pathname.includes('/webhook'))
    ) {
      if (!session?.user?.email) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    return NextResponse.next()
  } catch (error) {
    console.error('❌ Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/certificates/:path*',
    '/api/entities/:path*',
    '/api/stripe/:path*',
    '/api/stats',
    '/api/activity',
  ],
}
