import { describe, it, expect } from 'vitest'
import { getConnectionStatus, getInternalTeamRole, ONLINE_THRESHOLD_MS } from '@/lib/internal-team'

describe('internal-team', () => {
  it('getInternalTeamRole distingue Admin et Interne', () => {
    expect(getInternalTeamRole('brnbtech@gmail.com')).toBe('Admin')
    expect(getInternalTeamRole('brnbimmo@gmail.com')).toBe('Interne')
  })

  it('getConnectionStatus — en ligne si < 15 min', () => {
    const now = Date.now()
    expect(getConnectionStatus(new Date(now - 5 * 60 * 1000), now)).toBe('En ligne')
    expect(getConnectionStatus(new Date(now - 20 * 60 * 1000), now)).toBe('Hors ligne')
    expect(getConnectionStatus(null, now)).toBe('Hors ligne')
  })

  it('ONLINE_THRESHOLD_MS vaut 15 minutes', () => {
    expect(ONLINE_THRESHOLD_MS).toBe(15 * 60 * 1000)
  })
})
