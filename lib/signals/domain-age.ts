// lib/signals/domain-age.ts
// Âge du domaine via RDAP (cache Redis 24h)
// ============================================================

import { redis } from '@/lib/redis'

const WHOIS_CACHE_TTL = 24 * 60 * 60

export type DomainAgeResult = {
  agedays: number
  suspicious: boolean
}

type RdapEvent = {
  eventAction?: string
  eventDate?: string
}

type RdapResponse = {
  events?: RdapEvent[]
}

function parseCached(value: unknown): DomainAgeResult | null {
  if (!value) return null
  if (typeof value === 'object' && value !== null && 'agedays' in value) {
    return value as DomainAgeResult
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as DomainAgeResult
    } catch {
      return null
    }
  }
  return null
}

export async function getDomainAge(domain: string): Promise<DomainAgeResult> {
  const normalized = domain.trim().toLowerCase()
  if (!normalized) {
    return { agedays: -1, suspicious: false }
  }

  try {
    const cacheKey = `domain-age:${normalized}`

    if (redis) {
      try {
        const cached = await redis.get(cacheKey)
        const parsed = parseCached(cached)
        if (parsed) return parsed
      } catch {
        /* fail-soft cache read */
      }
    }

    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(normalized)}`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null)

    if (!res?.ok) {
      return { agedays: -1, suspicious: false }
    }

    const data = (await res.json()) as RdapResponse
    const events = data.events ?? []
    const registration = events.find((e) => e.eventAction === 'registration')

    if (!registration?.eventDate) {
      return { agedays: -1, suspicious: false }
    }

    const created = new Date(registration.eventDate)
    if (Number.isNaN(created.getTime())) {
      return { agedays: -1, suspicious: false }
    }

    const agedays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24))
    const result: DomainAgeResult = {
      agedays,
      suspicious: agedays >= 0 && agedays < 30,
    }

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: WHOIS_CACHE_TTL })
      } catch {
        /* fail-soft cache write */
      }
    }

    return result
  } catch {
    return { agedays: -1, suspicious: false }
  }
}
