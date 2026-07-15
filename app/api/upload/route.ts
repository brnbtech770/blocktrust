import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { z } from 'zod'
import { auth } from '@/app/lib/auth-server'
import { jsonInvalidBody } from '@/lib/api-json-body'
import { assertSameOriginMutation } from '@/lib/csrf-origin-guard'
import { assertDashboardMutationAllowed } from '@/lib/require-email-verified'
import { checkRateLimitUploadAsync } from '@/lib/rate-limit-sensitive'
import { validateUploadFileContent } from '@/lib/upload-file-validation'

/**
 * Types MIME acceptés pour l'upload de documents (KYC + Trust manuel).
 * - image/jpeg, image/png, image/webp : pièces d'identité, captures
 * - application/pdf : Kbis, justificatifs
 */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Préfixes de chemin selon le contexte d'upload — permet de cloisonner
 * les blobs par usage (lifecycle / nettoyage / audit).
 */
const PURPOSE_PREFIXES = {
  kyc: 'kyc',
  'trust-manual': 'trust-manual',
} as const
type Purpose = keyof typeof PURPOSE_PREFIXES

/** Nom de fichier sûr pour la clé blob (pas de path traversal ni caractères exotiques). */
function safeUploadFilename(original: string): string {
  const base = original.replace(/[/\\]/g, '').replace(/\.\./g, '').slice(0, 180)
  const m = base.match(/\.(jpe?g|png|webp|pdf)$/i)
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

  const originGuard = assertSameOriginMutation(req)
  if (!originGuard.ok) {
    return NextResponse.json({ error: originGuard.message }, { status: originGuard.status })
  }

  const mutationGuard = await assertDashboardMutationAllowed(session.user.id, session.user.email)
  if (!mutationGuard.ok) {
    return NextResponse.json(
      {
        error: mutationGuard.code,
        message: mutationGuard.message,
        ...(mutationGuard.code === 'DISCOVERY_EXPIRED' ? { upgradeUrl: mutationGuard.upgradeUrl } : {}),
      },
      { status: mutationGuard.status },
    )
  }

  const uploadRate = await checkRateLimitUploadAsync(session.user.id)
  if (!uploadRate.ok) {
    return NextResponse.json(
      { error: 'Trop de téléversements. Réessayez plus tard.' },
      { status: 429, headers: uploadRate.retryAfter ? { 'Retry-After': String(uploadRate.retryAfter) } : {} },
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'Type non autorisé (JPG, PNG, WEBP ou PDF)' },
      { status: 400 },
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Fichier trop volumineux (max 10 MB)' },
      { status: 400 },
    )
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer())
  const contentCheck = validateUploadFileContent(file.type, fileBytes)
  if (!contentCheck.ok) {
    return NextResponse.json({ error: contentCheck.message }, { status: 400 })
  }

  const purposeMetaSchema = z
    .object({
      purpose: z.enum(['kyc', 'trust-manual']).optional(),
    })
    .strict()

  const rawPurpose = formData.get('purpose')
  const purposeParsed = purposeMetaSchema.safeParse({
    purpose:
      typeof rawPurpose === 'string' && rawPurpose.length > 0
        ? rawPurpose
        : undefined,
  })
  if (!purposeParsed.success) {
    return jsonInvalidBody()
  }
  const purpose: Purpose = purposeParsed.data.purpose ?? 'kyc'
  const prefix = PURPOSE_PREFIXES[purpose]

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'Stockage indisponible (BLOB_READ_WRITE_TOKEN manquant)' },
      { status: 503 },
    )
  }

  try {
    const blob = await put(
      `${prefix}/${session.user.id}/${safeUploadFilename(file.name || 'upload')}`,
      Buffer.from(fileBytes),
      {
        // RGPD : pièces d'identité / justificatifs = données sensibles. Stockage PRIVÉ
        // (jamais accessible publiquement par URL). La lecture passe par un endpoint
        // admin authentifié qui streame le blob.
        access: 'private',
        addRandomSuffix: true,
        contentType: contentCheck.mime,
        token,
      },
    )

    return NextResponse.json({ pathname: blob.pathname })
  } catch (err) {
    // NE PAS logger le token / contenu du fichier
    console.error('[UPLOAD ERROR]', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 },
    )
  }
}
