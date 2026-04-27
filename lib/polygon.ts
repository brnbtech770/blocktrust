// lib/polygon.ts
// Ancrage des hashes de certificats sur Polygon (mainnet 137 ou Amoy 80002).
// Le hash est embarqué dans le champ `data` d'une self-transaction (équivalent OP_RETURN).
// ============================================================

import { ethers } from 'ethers'
import { prisma } from '@/app/lib/db'
import { createAdminAlert } from '@/lib/admin-alerts'

const RPC_URL = process.env.POLYGON_RPC_URL?.trim() || ''
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY?.trim() || ''
const CHAIN_ID = parseInt(process.env.POLYGON_CHAIN_ID?.trim() || '137', 10)

const EXPLORER_BASE =
  CHAIN_ID === 80002
    ? 'https://amoy.polygonscan.com/tx/'
    : 'https://polygonscan.com/tx/'

export interface AnchorResult {
  txHash: string
  blockNumber: number
  explorerUrl: string
}

export interface VerifyAnchorResult {
  verified: boolean
  blockNumber?: number
  timestamp?: number
}

export function isPolygonConfigured(): boolean {
  return Boolean(RPC_URL && PRIVATE_KEY)
}

function getProvider(): ethers.JsonRpcProvider {
  if (!RPC_URL) throw new Error('POLYGON_RPC_URL manquante')
  return new ethers.JsonRpcProvider(RPC_URL)
}

function getWallet(): ethers.Wallet {
  if (!PRIVATE_KEY) throw new Error('POLYGON_PRIVATE_KEY manquante')
  return new ethers.Wallet(PRIVATE_KEY, getProvider())
}

/**
 * Ancre un hash sur Polygon en envoyant une transaction self-to-self avec le
 * payload `BLOCKTRUST:<certificateId>:<hash>` dans le champ data.
 * Renvoie le txHash + blockNumber + URL explorer.
 */
export async function anchorToPolygon(
  certificateId: string,
  hash: string
): Promise<AnchorResult> {
  if (!isPolygonConfigured()) {
    throw new Error('Polygon non configuré (RPC_URL ou PRIVATE_KEY manquants)')
  }

  const wallet = getWallet()

  const payload = `BLOCKTRUST:${certificateId}:${hash}`
  const data = ethers.hexlify(ethers.toUtf8Bytes(payload))

  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: BigInt(0),
    data,
    chainId: CHAIN_ID,
  })

  const receipt = await tx.wait()
  if (!receipt) {
    throw new Error('Transaction Polygon sans receipt')
  }

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    explorerUrl: `${EXPLORER_BASE}${receipt.hash}`,
  }
}

export interface RetryAnchorsResult {
  skipped: boolean
  examined: number
  anchored: number
  failed: number
  noHash: number
}

/**
 * Reprend en lot les ancrages Polygon en échec ou en attente pour les
 * certificats ACTIVE. Limité à `max` (défaut 25) par exécution.
 * Fail gracefully si Polygon n'est pas configuré.
 */
export async function retryFailedAnchors(max = 25): Promise<RetryAnchorsResult> {
  if (!isPolygonConfigured()) {
    return { skipped: true, examined: 0, anchored: 0, failed: 0, noHash: 0 }
  }

  const candidates = await prisma.certificate.findMany({
    where: {
      status: 'ACTIVE',
      blockchainStatus: { in: ['FAILED', 'PENDING'] },
    },
    orderBy: { issuedAt: 'asc' },
    take: max,
    select: {
      id: true,
      entityId: true,
      blockchainStatus: true,
      signatures: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: { contextHash: true, jti: true },
      },
    },
  })

  let anchored = 0
  let failed = 0
  let noHash = 0

  for (const cert of candidates) {
    const hash = cert.signatures[0]?.contextHash ?? cert.signatures[0]?.jti
    if (!hash) {
      noHash += 1
      continue
    }
    try {
      const anchor = await anchorToPolygon(cert.id, hash)
      await prisma.certificate.update({
        where: { id: cert.id },
        data: {
          polygonTxHash: anchor.txHash,
          polygonBlock: anchor.blockNumber,
          polygonAnchoredAt: new Date(),
          polygonExplorerUrl: anchor.explorerUrl,
          blockchainStatus: 'ANCHORED',
        },
      })
      await createAdminAlert({
        type: 'CERT_ANCHORED',
        title: 'Certificat ancré sur Polygon (cron retry)',
        description: `TX: ${anchor.txHash} — bloc #${anchor.blockNumber}`,
        entityId: cert.entityId,
        metadata: {
          certificateId: cert.id,
          txHash: anchor.txHash,
          blockNumber: anchor.blockNumber,
          explorerUrl: anchor.explorerUrl,
          via: 'cron',
        },
      }).catch(() => undefined)
      anchored += 1
    } catch (err: any) {
      console.error('[Polygon] retry échec', cert.id, ':', err?.message ?? err)
      await prisma.certificate
        .update({
          where: { id: cert.id },
          data: { blockchainStatus: 'FAILED' },
        })
        .catch(() => undefined)
      failed += 1
    }
  }

  return {
    skipped: false,
    examined: candidates.length,
    anchored,
    failed,
    noHash,
  }
}

/**
 * Vérifie qu'un ancrage existe bien on-chain (status === 1).
 * Fail gracefully (retourne verified=false) si la chaîne est indisponible.
 */
export async function verifyAnchor(txHash: string): Promise<VerifyAnchorResult> {
  if (!RPC_URL) return { verified: false }

  try {
    const provider = getProvider()
    const receipt = await provider.getTransactionReceipt(txHash)
    if (!receipt) return { verified: false }

    const block = await provider.getBlock(receipt.blockNumber)
    return {
      verified: receipt.status === 1,
      blockNumber: receipt.blockNumber,
      timestamp: block?.timestamp,
    }
  } catch (err) {
    console.error('[Polygon] verifyAnchor error:', (err as Error).message)
    return { verified: false }
  }
}
