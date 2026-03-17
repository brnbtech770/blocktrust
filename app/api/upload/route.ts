import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/app/lib/auth-server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json(
      { error: 'Fichier manquant' }, { status: 400 }
    )
  }

  const allowed = [
    'image/jpeg', 'image/png', 'application/pdf'
  ]
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: 'Type non autorisé (JPG, PNG, PDF)' },
      { status: 400 }
    )
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Fichier trop volumineux (max 10MB)' },
      { status: 400 }
    )
  }

  try {
    const blob = await put(
      `kyc/${session.user.id}/${Date.now()}-${file.name}`,
      file,
      { access: 'private' }
    )

    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error('[UPLOAD ERROR]', err)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    )
  }
}
