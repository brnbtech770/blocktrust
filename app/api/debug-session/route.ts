import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  // 1. List all cookie names (no values for security)
  const cookieStore = await cookies()
  const cookieNames = cookieStore.getAll().map(c => c.name)

  // 2. Check auth() session
  let session = null
  let authError = null
  try {
    session = await auth()
  } catch (e) {
    authError = String(e)
  }

  return NextResponse.json({
    cookieNames,
    hasSession: !!session,
    sessionUser: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    } : null,
    authError,
  })
}
