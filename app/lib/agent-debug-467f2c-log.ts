/**
 * Journal debug session Cursor 467f2c : console + ingest + fichiers locaux (sans PII).
 */
import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const SESSION = '467f2c'
const INGEST = 'http://127.0.0.1:7242/ingest/bcf6afcf-d9fe-4562-9afc-d7d8113f78b5'
const RING_MAX = 80
const RING_KEY = '__btAgentDebug467f2cRing'

type GlobalWithAgentRing = typeof globalThis & {
  __btAgentDebug467f2cRing?: Record<string, unknown>[]
}

function agentRingStore(): Record<string, unknown>[] {
  const g = globalThis as GlobalWithAgentRing
  if (!g[RING_KEY]) g[RING_KEY] = []
  return g[RING_KEY]!
}

export function pushAgentDebugRing(entry: Record<string, unknown>) {
  const ring = agentRingStore()
  ring.push(entry)
  while (ring.length > RING_MAX) ring.shift()
}

/** Dernières entrées sur cette instance Node (serverless : une seule lambda « chaude »). */
export function getAgentDebugRing(): Record<string, unknown>[] {
  const g = globalThis as GlobalWithAgentRing
  return g[RING_KEY] ? [...g[RING_KEY]] : []
}

export type AgentDebugPayload = {
  hypothesisId: string
  location: string
  message: string
  data: Record<string, string | number | boolean | null>
  runId?: string
}

export async function writeAgentDebugLog(payload: AgentDebugPayload) {
  const body = {
    sessionId: SESSION,
    ...payload,
    timestamp: Date.now(),
  }
  const line = `${JSON.stringify(body)}\n`
  console.log('[BT-DEBUG-467f2c]', line.trimEnd())
  pushAgentDebugRing(body as Record<string, unknown>)

  fetch(INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION,
    },
    body: JSON.stringify(body),
  }).catch(() => {})

  const cwd = process.cwd()
  try {
    await mkdir(path.join(cwd, '.cursor'), { recursive: true })
    await appendFile(path.join(cwd, '.cursor', 'debug-467f2c.log'), line, 'utf8')
  } catch (e) {
    console.error('[BT-DEBUG-467f2c] write .cursor/debug-467f2c.log', e)
  }
  try {
    await appendFile(path.join(cwd, 'agent-debug-467f2c.ndjson'), line, 'utf8')
  } catch (e) {
    console.error('[BT-DEBUG-467f2c] write agent-debug-467f2c.ndjson', e)
  }
}
