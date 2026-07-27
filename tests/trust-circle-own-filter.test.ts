import { describe, expect, it } from 'vitest'
import {
  buildOwnEmailSet,
  filterOwnTrustCircleRelations,
  isOwnTrustCircleRelation,
} from '@/lib/trust-circle-own-filter'

describe('trust-circle-own-filter', () => {
  it('buildOwnEmailSet inclut session + entités', () => {
    const set = buildOwnEmailSet('Me@Example.com', ['Badge@Corp.fr', null])
    expect(set.has('me@example.com')).toBe(true)
    expect(set.has('badge@corp.fr')).toBe(true)
  })

  it('filtre les relations vers ses propres emails', () => {
    const userId = 'user-1'
    const ownEmails = buildOwnEmailSet('owner@test.com', ['biz@test.com'])
    const relations = [
      { id: 'a', toUserId: 'other', toEmail: 'friend@test.com' },
      { id: 'b', toUserId: null, toEmail: 'biz@test.com' },
      { id: 'c', toUserId: userId, toEmail: 'x@test.com' },
    ]
    const filtered = filterOwnTrustCircleRelations(relations, userId, ownEmails)
    expect(filtered.map((r) => r.id)).toEqual(['a'])
  })

  it('isOwnTrustCircleRelation détecte toUser self', () => {
    const own = buildOwnEmailSet('a@test.com', [])
    expect(
      isOwnTrustCircleRelation(
        { toUserId: 'u1', toEmail: 'b@test.com', toUser: { id: 'u1', email: 'b@test.com' } },
        'u1',
        own,
      ),
    ).toBe(true)
  })
})
