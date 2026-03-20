import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@/app/lib/auth-server'

/** Nom de fichier sûr pour la clé blob (pas de path traversal ni caractères exotiques). */
function safeUploadFilename(original: string): string {
  const base = original.replace(/[/\\]/g, '').replace(/\.\./g, '').slice(0, 180)
  const m = base.match(/\.(jpe?g|png|pdf)$/i)
  const ext = m ? m[0].toLowerCase() : ''
  const stem = base
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80)
  const part = (stem || 'document') + ext
  return `${Date.now()}-${part}`
}

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
      `kyc/${session.user.id}/${safeUploadFilename(file.name || 'upload')}`,
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
