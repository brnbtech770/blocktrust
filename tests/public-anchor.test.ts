import { describe, it, expect } from 'vitest'
import {
  adminAnchorDetails,
  isCertificateAnchored,
  publicAnchorPayload,
} from '@/lib/public-anchor'

describe('publicAnchorPayload', () => {
  it('masque les hashes et expose anchored + anchoredAt', () => {
    const payload = publicAnchorPayload({
      blockchainStatus: 'ANCHORED',
      polygonTxHash: '0xdeadbeef',
      polygonBlock: 52847291,
      polygonExplorerUrl: 'https://polygonscan.com/tx/0xdeadbeef',
      polygonAnchoredAt: new Date('2026-03-01T12:00:00.000Z'),
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    expect(payload).toEqual({
      anchored: true,
      anchoredAt: '2026-03-01T12:00:00.000Z',
    })
    expect(payload).not.toHaveProperty('txHash')
    expect(payload).not.toHaveProperty('contractAddress')
    expect(payload).not.toHaveProperty('blockNumber')
    expect(payload).not.toHaveProperty('polygonScanUrl')
  })

  it('ne prétend pas un ancrage pour NOT_ANCHORED même avec un txHash legacy', () => {
    expect(
      isCertificateAnchored({
        blockchainStatus: 'NOT_ANCHORED',
        polygonTxHash: '0xabc',
      }),
    ).toBe(false)
    expect(
      publicAnchorPayload({
        blockchainStatus: 'NOT_ANCHORED',
        polygonTxHash: '0xabc',
        issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ).toEqual({ anchored: false, anchoredAt: null })
  })

  it('conserve les détails techniques pour l’admin', () => {
    const details = adminAnchorDetails({
      blockchainStatus: 'ANCHORED',
      polygonTxHash: '0xabc',
      polygonBlock: 12,
      polygonExplorerUrl: 'https://polygonscan.com/tx/0xabc',
      polygonAnchoredAt: new Date('2026-03-01T12:00:00.000Z'),
    })
    expect(details.txHash).toBe('0xabc')
    expect(details.blockNumber).toBe(12)
    expect(details.explorerUrl).toBe('https://polygonscan.com/tx/0xabc')
    expect(details.contractAddress).toBeTruthy()
    expect(details.anchoredAt).toBe('2026-03-01T12:00:00.000Z')
  })
})
