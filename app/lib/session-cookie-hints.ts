import { cookies } from 'next/headers'

/** Présence d’un cookie de session Auth.js (y compris chunks). */
export async function hasAuthJsSessionCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  const hints = cookieStore.getAll().filter(
    (c) =>
      c.name === 'authjs.session-token' ||
      c.name === '__Secure-authjs.session-token' ||
      c.name.startsWith('authjs.session-token.') ||
      c.name.startsWith('__Secure-authjs.session-token.')
  )
  return hints.length > 0
}
