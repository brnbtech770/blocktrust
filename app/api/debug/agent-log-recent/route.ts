/**
 * Preuves debug session 467f2c :
 * - Dev : fichier agent-debug-467f2c.ndjson + ring mémoire
 * - Prod : ring uniquement si Authorization: Bearer <BT_DEBUG_RING_SECRET> (variable Vercel)
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { getAgentDebugRing } from '@/app/lib/agent-debug-467f2c-log'

export const dynamic = 'force-dynamic'

function authorizeRing(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'development') return true
  const secret = process.env.BT_DEBUG_RING_SECRET
  if (!secret || secret.length < 16) return false
  const authz = req.headers.get('authorization')
  return authz === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorizeRing(req)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const ring = getAgentDebugRing()

  const filePath = path.join(process.cwd(), 'agent-debug-467f2c.ndjson')
  let fileEntries: Record<string, unknown>[] = []
  if (process.env.NODE_ENV === 'development') {
    try {
      const raw = await readFile(filePath, 'utf8')
      const lines = raw
        .trim()
        .split('\n')
        .filter(Boolean)
        .slice(-40)
      fileEntries = lines.map((line, i) => {
        try {
          return JSON.parse(line) as Record<string, unknown>
        } catch {
          return { parseError: true as const, lineIndex: i }
        }
      })
    } catch {
      /* pas de fichier encore */
    }
  }

  const merged = [...ring, ...fileEntries].sort(
    (a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0)
  )

  return NextResponse.json({
    sources: { memoryRing: ring.length, file: fileEntries.length },
    count: merged.length,
    entries: merged.slice(-60),
    hint:
      process.env.NODE_ENV !== 'development'
        ? 'Ring = instance actuelle seulement. Pour prod, définir BT_DEBUG_RING_SECRET (≥16) et envoyer le header Authorization: Bearer <secret>.'
        : undefined,
  })
}
