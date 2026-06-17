import { describe, it, expect, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  rejectForbiddenExtensionOrigin,
  extensionOptionsResponse,
} from '@/lib/extension-cors'

const ORIGINAL_EXTENSION_ID = process.env.EXTENSION_ID

function extensionRequest(extensionId: string): NextRequest {
  return new NextRequest('https://blocktrust.tech/api/extension/me', {
    headers: { origin: `chrome-extension://${extensionId}` },
  })
}

describe('extension-cors — EXTENSION_ID prod', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    process.env.EXTENSION_ID = ORIGINAL_EXTENSION_ID
  })

  it('prod sans EXTENSION_ID → chrome-extension refusé (403)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.EXTENSION_ID
    const res = rejectForbiddenExtensionOrigin(
      extensionRequest('unknownextensionid123'),
    )
    expect(res?.status).toBe(403)
  })

  it('prod avec EXTENSION_ID → extension autorisée uniquement si ID listé', () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.EXTENSION_ID = 'bemcnlbifffejlijnndkdgcjpmijfaeg'

    expect(
      rejectForbiddenExtensionOrigin(
        extensionRequest('bemcnlbifffejlijnndkdgcjpmijfaeg'),
      ),
    ).toBeNull()

    expect(
      rejectForbiddenExtensionOrigin(extensionRequest('maliciousextension'))?.status,
    ).toBe(403)
  })

  it('dev sans EXTENSION_ID → permissif', () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.EXTENSION_ID
    expect(
      rejectForbiddenExtensionOrigin(extensionRequest('localdevextension')),
    ).toBeNull()
  })

  it('OPTIONS refusé si origin extension interdite en prod', () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.EXTENSION_ID
    const res = extensionOptionsResponse(extensionRequest('anyid'))
    expect(res.status).toBe(403)
  })
})
