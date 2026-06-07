import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { secureCompareBearer } from '@/lib/api-key'

export const dynamic = 'force-dynamic'

/** Accès : admin connecté ou Bearer CRON_SECRET (ops interne). */
async function canResetOAuthCookies(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (cronSecret && secureCompareBearer(req.headers.get('authorization'), cronSecret)) {
    return true
  }

  const session = await auth()
  return Boolean(session?.user?.email && isAdmin(session.user.email))
}

/**
 * Efface les cookies Auth.js du flux OAuth (callback-url, state, PKCE).
 * Contournement si un cookie invalide déclenche assertConfig → ?error=Configuration.
 * Ne supprime pas le cookie de session JWT.
 */
export async function GET(req: NextRequest) {
  if (!(await canResetOAuthCookies(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost ?? req.headers.get('host') ?? req.nextUrl.host
  const rawProto = req.headers.get('x-forwarded-proto')
  const proto =
    rawProto ?? (req.nextUrl.protocol === 'https:' ? 'https' : 'http')
  const dest = `${proto}://${host}/auth/signin?cleared=oauth`

  const res = NextResponse.redirect(dest, 302)
  const secure = proto === 'https'

  const clear = (name: string, opts?: { secure?: boolean }) => {
    res.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: opts?.secure ?? (name.startsWith('__Secure-') || name.startsWith('__Host-')),
    })
  }

  for (const name of [
    'authjs.callback-url',
    '__Secure-authjs.callback-url',
    'authjs.state',
    '__Secure-authjs.state',
    'authjs.pkce.code_verifier',
    '__Secure-authjs.pkce.code_verifier',
  ]) {
    clear(name)
  }

  clear('authjs.csrf-token', { secure })
  clear('__Secure-authjs.csrf-token', { secure: true })
  clear('__Host-authjs.csrf-token', { secure: true })

  return res
}
