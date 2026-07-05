// app/api/admin/demandes/document/route.ts
// Relecture ADMIN d'une pièce justificative (Trust manuel) stockée en blob PRIVÉ.
//
// GET /api/admin/demandes/document?path=<pathname>
//   - Réservé aux administrateurs (RGPD : données d'identité sensibles).
//   - Streame le blob privé via le SDK @vercel/blob (token serveur).
//   - Rétro-compat : si `path` est une ancienne URL publique https, on redirige.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/blob'
import { Prisma } from '@prisma/client'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_LEGACY_DOCUMENT_HOSTS = new Set([
  'blob.vercel-storage.com',
  'public.blob.vercel-storage.com',
])

function isAllowedLegacyDocumentUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return (
      ALLOWED_LEGACY_DOCUMENT_HOSTS.has(host) ||
      host.endsWith('.blob.vercel-storage.com') ||
      host.endsWith('.public.blob.vercel-storage.com')
    )
  } catch {
    return false
  }
}

/** Variantes d'un path/URL blob pour comparer avec les entrées en DB. */
function documentReferenceVariants(ref: string): string[] {
  const trimmed = ref.trim()
  const variants = new Set<string>([trimmed])
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      variants.add(url.pathname)
      variants.add(url.href)
    } catch {
      /* ignore */
    }
  } else {
    variants.add(trimmed.startsWith('/') ? trimmed : `/${trimmed}`)
    variants.add(trimmed.replace(/^\//, ''))
  }
  return [...variants]
}

/** Vérifie que le document appartient à une demande Trust manuel existante (anti-IDOR blob). */
async function isDocumentLinkedToDemand(documentRef: string): Promise<boolean> {
  const targets = new Set(documentReferenceVariants(documentRef))
  const entries = await prisma.userManualTrustEntry.findMany({
    where: { documents: { not: Prisma.DbNull } },
    select: { documents: true },
  })

  for (const { documents } of entries) {
    if (!Array.isArray(documents)) continue
    for (const doc of documents) {
      if (typeof doc !== 'string') continue
      for (const variant of documentReferenceVariants(doc)) {
        if (targets.has(variant)) return true
      }
    }
  }
  return false
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const path = req.nextUrl.searchParams.get('path')?.trim()
  if (!path) {
    return NextResponse.json({ error: 'Paramètre `path` manquant' }, { status: 400 })
  }

  const linked = await isDocumentLinkedToDemand(path)
  if (!linked) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rétro-compat : anciens documents stockés en URL publique Vercel Blob uniquement.
  if (/^https?:\/\//i.test(path)) {
    if (!isAllowedLegacyDocumentUrl(path)) {
      return NextResponse.json({ error: 'URL de document non autorisée' }, { status: 400 })
    }
    return NextResponse.redirect(path)
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'Stockage indisponible' },
      { status: 503 },
    )
  }

  try {
    const result = await get(path, { access: 'private', token })
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    }
    return new Response(result.stream, {
      status: 200,
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        // Jamais en cache partagé : donnée personnelle sensible.
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
  }
}
