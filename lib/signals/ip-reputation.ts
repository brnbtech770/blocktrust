// lib/signals/ip-reputation.ts
// Réputation IP via AbuseIPDB (cache Redis 1h)
// ============================================================

import { getRedis } from '@/lib/redis'

export type IpReputationResult = {
  score: number
  abusive: boolean
  isp: string
}

const FALLBACK: IpReputationResult = { score: 0, abusive: false, isp: '' }

function parseCached(value: unknown): IpReputationResult | null {
  if (!value) return null
  if (typeof value === 'object' && value !== null && 'score' in value) {
    return value as IpReputationResult
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as IpReputationResult
    } catch {
      return null
    }
  }
  return null
}

type AbuseIpDbResponse = {
  data?: {
    abuseConfidenceScore?: number
    isp?: string
  }
}

export async function checkIpReputation(ip: string): Promise<IpReputationResult> {
  const trimmed = ip.trim()
  if (!trimmed || trimmed === 'unknown') {
    return FALLBACK
  }

  try {
    if (!process.env.ABUSEIPDB_API_KEY?.trim()) {
      return FALLBACK
    }

    const cacheKey = `ip-rep:${trimmed}`
    const redis = getRedis()

    if (redis) {
      try {
        const cached = await redis.get(cacheKey)
        const parsed = parseCached(cached)
        if (parsed) return parsed
      } catch {
        /* fail-soft cache read */
      }
    }

    // ⚠️ RGPD — TRANSFERT D'IP À UN TIERS (AbuseIPDB)
    // L'adresse IP brute est une donnée à caractère personnel. Cet appel transmet
    // l'IP du visiteur à AbuseIPDB (sous-traitant / destinataire tiers, hors UE).
    // Base légale : intérêt légitime (art. 6.1.f RGPD) — prévention de la fraude et
    // de l'abus sur un service de certification d'identité.
    // ACTIONS REGISTRE DES TRAITEMENTS (Laurianne / DPO) :
    //   - Inscrire ce transfert au registre (finalité : anti-fraude / scoring de risque).
    //   - Vérifier l'existence d'un DPA / clauses contractuelles types avec AbuseIPDB.
    //   - Documenter la durée de conservation (cache 90 j) et l'information des personnes
    //     (mention dans la politique de confidentialité).
    //   - Évaluer la pertinence d'une pseudonymisation/anonymisation préalable.
    const res = await fetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(trimmed)}&maxAgeInDays=90`,
      {
        headers: {
          Key: process.env.ABUSEIPDB_API_KEY,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(3000),
      },
    ).catch(() => null)

    if (!res?.ok) {
      return FALLBACK
    }

    const data = (await res.json()) as AbuseIpDbResponse
    const result: IpReputationResult = {
      score: data.data?.abuseConfidenceScore ?? 0,
      abusive: (data.data?.abuseConfidenceScore ?? 0) > 50,
      isp: data.data?.isp ?? '',
    }

    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(result), { ex: 3600 })
      } catch {
        /* fail-soft cache write */
      }
    }

    return result
  } catch {
    return FALLBACK
  }
}
