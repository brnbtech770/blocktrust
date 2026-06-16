import { describe, expect, it, afterEach } from 'vitest'
import {
  BLOCKTRUST_SITE_ENTITY,
  getBlocktrustSiteCertPublicIdSync,
} from '@/lib/blocktrust-site-cert'

describe('blocktrust-site-cert', () => {
  const prevSiteCert = process.env.BLOCKTRUST_SITE_CERT_ID
  const prevPublicCert = process.env.NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID

  afterEach(() => {
    if (prevSiteCert === undefined) delete process.env.BLOCKTRUST_SITE_CERT_ID
    else process.env.BLOCKTRUST_SITE_CERT_ID = prevSiteCert
    if (prevPublicCert === undefined) delete process.env.NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID
    else process.env.NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID = prevPublicCert
  })

  it('BLOCKTRUST_SITE_ENTITY — marque et domaine officiels', () => {
    expect(BLOCKTRUST_SITE_ENTITY.legalName).toBe('BLOCKTRUST™')
    expect(BLOCKTRUST_SITE_ENTITY.email).toBe('contact@blocktrust.tech')
    expect(BLOCKTRUST_SITE_ENTITY.domain).toBe('blocktrust.tech')
  })

  it('getBlocktrustSiteCertPublicIdSync lit BLOCKTRUST_SITE_CERT_ID', () => {
    process.env.BLOCKTRUST_SITE_CERT_ID = 'cert-abc'
    expect(getBlocktrustSiteCertPublicIdSync()).toBe('cert-abc')
  })

  it('getBlocktrustSiteCertPublicIdSync fallback NEXT_PUBLIC', () => {
    delete process.env.BLOCKTRUST_SITE_CERT_ID
    process.env.NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID = 'pub-xyz'
    expect(getBlocktrustSiteCertPublicIdSync()).toBe('pub-xyz')
  })

  it('getBlocktrustSiteCertPublicIdSync null si absent', () => {
    delete process.env.BLOCKTRUST_SITE_CERT_ID
    delete process.env.NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID
    expect(getBlocktrustSiteCertPublicIdSync()).toBeNull()
  })
})
