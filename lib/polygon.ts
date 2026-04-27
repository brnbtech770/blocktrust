// lib/polygon.ts
// Ancrage des hashes de certificats sur Polygon (mainnet 137 ou Amoy 80002).
// Le hash est embarqué dans le champ `data` d'une self-transaction (équivalent OP_RETURN).
// ============================================================

import { ethers } from 'ethers'

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
