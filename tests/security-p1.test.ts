import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { countScoreEligibleMutuals } from '@/lib/trust-engine'
import { checkTrustCircleInviteRateLimit } from '@/lib/rate-limit-plan'

const DAY = 24 * 60 * 60 * 1000

function walkSource(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'dist') continue
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walkSource(full, acc)
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) acc.push(full)
  }
  return acc
}

describe('P1 — anti-Sybil networkScore', () => {
  const now = new Date('2026-09-23T12:00:00.000Z')

  it('ignore les relations de moins de 7 jours et les non datées invalides', () => {
    const recent = new Date(now.getTime() - 6 * DAY)
    const eligible = new Date(now.getTime() - 8 * DAY)
    expect(countScoreEligibleMutuals([recent, eligible, 'not-a-date'], now)).toBe(1)
  })

  it('plafonne à 3 relations mutuelles par fenêtre de 7 jours', () => {
    const base = now.getTime() - 30 * DAY
    const sameWindow = Array.from({ length: 10 }, () => new Date(base))
    expect(countScoreEligibleMutuals(sameWindow, now)).toBe(3)

    const spread = Array.from({ length: 6 }, (_, i) => new Date(base - i * 7 * DAY))
    expect(countScoreEligibleMutuals(spread, now)).toBe(6)
  })
})

describe('P1 — invitations Trust Circle', () => {
  it('refuse la 11e invitation du même jour', async () => {
    const userId = `invite-cap-${Date.now()}-${Math.random()}`
    for (let i = 0; i < 10; i += 1) {
      const allowed = await checkTrustCircleInviteRateLimit(userId)
      expect(allowed.ok).toBe(true)
    }
    const blocked = await checkTrustCircleInviteRateLimit(userId)
    expect(blocked.ok).toBe(false)
    expect(blocked.limit).toBe(10)
  })
})

describe('P1 — libellé domaine', () => {
  it('« Domaine vérifié » n’apparaît plus dans le code produit', () => {
    const root = process.cwd()
    const files = [
      ...walkSource(path.join(root, 'app')),
      ...walkSource(path.join(root, 'lib')),
      ...walkSource(path.join(root, 'extension')),
    ]
    const hits = files.filter((file) =>
      readFileSync(file, 'utf8').includes('Domaine vérifié'),
    )
    expect(hits).toEqual([])
  })
})
