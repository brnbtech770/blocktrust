import { describe, it, expect, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  rejectForbiddenExtensionOrigin,
  extensionOptionsResponse,
} from '@/lib/extension-cors'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_EXTENSION_ID = process.env.EXTENSION_ID

function extensionRequest(extensionId: string): NextRequest {
  return new NextRequest('https://blocktrust.tech/api/extension/me', {
    headers: { origin: `chrome-extension://${extensionId}` },
  })
}

describe('extension-cors — EXTENSION_ID prod', () => {
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV
    process.env.EXTENSION_ID = ORIGINAL_EXTENSION_ID
  })

  it('prod sans EXTENSION_ID → chrome-extension refusé (403)', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.EXTENSION_ID
    const res = rejectForbiddenExtensionOrigin(
      extensionRequest('unknownextensionid123'),
    )
    expect(res?.status).toBe(403)
  })

  it('prod avec EXTENSION_ID → extension autorisée uniquement si ID listé', () => {
    process.env.NODE_ENV = 'production'
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
    process.env.NODE_ENV = 'development'
    delete process.env.EXTENSION_ID
    expect(
      rejectForbiddenExtensionOrigin(extensionRequest('localdevextension')),
    ).toBeNull()
  })

  it('OPTIONS refusé si origin extension interdite en prod', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.EXTENSION_ID
    const res = extensionOptionsResponse(extensionRequest('anyid'))
    expect(res.status).toBe(403)
  })
})
