import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDomainAge } from '@/lib/signals/domain-age'
import { checkIpReputation } from '@/lib/signals/ip-reputation'
import { isDisposableEmail, getEmailDomain } from '@/lib/signals/disposable-email'

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock('@/lib/redis', () => ({ redis: redisMock }))

describe('signals — disposable email', () => {
  it('détecte mailinator', () => {
    expect(isDisposableEmail('user@mailinator.com')).toBe(true)
    expect(isDisposableEmail('user@gmail.com')).toBe(false)
  })

  it('extrait le domaine', () => {
    expect(getEmailDomain('User@Example.COM')).toBe('example.com')
    expect(getEmailDomain('invalid')).toBe('')
  })
})

describe('signals — domain age', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redisMock.get.mockResolvedValue(null)
    redisMock.set.mockResolvedValue('OK')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          events: [{ eventAction: 'registration', eventDate: '2020-01-01T00:00:00Z' }],
        }),
      }),
    )
  })

  it('retourne agedays depuis RDAP', async () => {
    const result = await getDomainAge('example.com')
    expect(result.agedays).toBeGreaterThan(365)
    expect(result.suspicious).toBe(false)
    expect(redisMock.set).toHaveBeenCalled()
  })

  it('marque suspect si < 30 jours', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          events: [{ eventAction: 'registration', eventDate: new Date().toISOString() }],
        }),
      }),
    )
    const result = await getDomainAge('new-domain.test')
    expect(result.suspicious).toBe(true)
  })

  it('fail-soft si RDAP indisponible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const result = await getDomainAge('fail.test')
    expect(result).toEqual({ agedays: -1, suspicious: false })
  })

  it('lit le cache Redis', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify({ agedays: 500, suspicious: false }))
    const result = await getDomainAge('cached.test')
    expect(result.agedays).toBe(500)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('signals — IP reputation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    redisMock.get.mockResolvedValue(null)
    redisMock.set.mockResolvedValue('OK')
    delete process.env.ABUSEIPDB_API_KEY
  })

  it('fail-soft sans clé API', async () => {
    const result = await checkIpReputation('8.8.8.8')
    expect(result).toEqual({ score: 0, abusive: false, isp: '' })
  })

  it('retourne score AbuseIPDB', async () => {
    process.env.ABUSEIPDB_API_KEY = 'test-key'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { abuseConfidenceScore: 75, isp: 'Test ISP' },
        }),
      }),
    )

    const result = await checkIpReputation('203.0.113.1')

    expect(result.abusive).toBe(true)
    expect(result.score).toBe(75)
    expect(result.isp).toBe('Test ISP')
  })
})
