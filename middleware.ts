import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Évite le cas www vs apex : cookies de session OAuth sont host-only ;
 * si l’utilisateur commence sur www alors que NEXTAUTH_URL est en apex (ou l’inverse), la session « disparaît ».
 * Redirige uniquement www.<hostname NEXTAUTH_URL> → hostname NEXTAUTH_URL.
 */
export function middleware(request: NextRequest) {
  let canonicalHost: string | null = null
  const base = process.env.NEXTAUTH_URL || process.env.AUTH_URL
  try {
    if (base) canonicalHost = new URL(base).hostname.toLowerCase()
  } catch {
    canonicalHost = null
  }
  if (!canonicalHost) return NextResponse.next()

  const rawHost = request.headers.get('host') ?? ''
  const host = rawHost.split(':')[0].toLowerCase()
  if (host === canonicalHost) return NextResponse.next()

  const wwwVariant = `www.${canonicalHost}`
  if (host !== wwwVariant) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.hostname = canonicalHost
  return NextResponse.redirect(url, 308)
}

export const config = {
  matcher: [
    /*
     * Exclure assets et préflight ; matcher tout le reste pour forcer l’hôte canonique
     * avant /api/auth/* (OAuth / cookies).
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
