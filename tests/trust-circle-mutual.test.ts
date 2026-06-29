import { describe, expect, it } from 'vitest'
import { canPromoteToMutual } from '@/lib/trust-circle-mutual'

describe('canPromoteToMutual', () => {
  it('retourne false si pas de relation inverse', () => {
    expect(canPromoteToMutual(null)).toBe(false)
    expect(canPromoteToMutual(undefined)).toBe(false)
  })

  it('retourne false si déjà mutuel', () => {
    expect(canPromoteToMutual({ status: 'CONFIRMED', isMutual: true })).toBe(false)
  })

  it('retourne true pour relation inverse PENDING ou CONFIRMED', () => {
    expect(canPromoteToMutual({ status: 'PENDING', isMutual: false })).toBe(true)
    expect(canPromoteToMutual({ status: 'CONFIRMED', isMutual: false })).toBe(true)
  })

  it('retourne false pour statuts non éligibles', () => {
    expect(canPromoteToMutual({ status: 'REJECTED', isMutual: false })).toBe(false)
  })
})
