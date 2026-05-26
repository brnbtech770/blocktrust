// lib/polygon.ts
// Ancrage des hashes de certificats sur Polygon (mainnet 137 ou Amoy 80002).
// Le hash est embarqué dans le champ `data` d'une transaction value=0 envoyée
// vers une burn address (ou un contrat dédié si POLYGON_CONTRACT_ADDRESS).
// ============================================================

import { createHash } from 'node:crypto'
import { ethers } from 'ethers'
import { prisma } from '@/app/lib/db'
import { createAdminAlert } from '@/lib/admin-alerts'
import { sendCertificateAnchoredEmail } from '@/lib/email'
import { buildPublicVerifyUrl } from '@/lib/public-verify-url'

const RPC_URL = process.env.POLYGON_RPC_URL?.trim() || ''
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY?.trim() || ''
const CHAIN_ID = parseInt(process.env.POLYGON_CHAIN_ID?.trim() || '137', 10)

// Burn address EVM standard. Certains RPC publics rejettent les transactions
// `from === to` ; on envoie donc systématiquement vers une autre adresse.
const DEFAULT_BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD'

function resolveAnchorRecipient(walletAddress: string): string {
  const raw = process.env.POLYGON_CONTRACT_ADDRESS?.trim()
  let candidate = raw && raw.length > 0 ? raw : DEFAULT_BURN_ADDRESS

  // Validation : si la valeur n'est pas une adresse EVM valide, on retombe sur
  // la burn address. On garantit aussi que l'adresse cible n'est jamais celle
  // du wallet émetteur (sinon certains RPC rejettent la tx).
  try {
    candidate = ethers.getAddress(candidate)
  } catch {
    candidate = ethers.getAddress(DEFAULT_BURN_ADDRESS)
  }

  if (candidate.toLowerCase() === walletAddress.toLowerCase()) {
    candidate = ethers.getAddress(DEFAULT_BURN_ADDRESS)
  }

  return candidate
}

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

/**
 * Calcule le hash à ancrer pour un certificat.
 * Priorité au contextHash de la dernière Signature (cohérence avec le QR public).
 * Sinon, fallback déterministe SHA-256(`${id}:${entityId}:${issuedAt}`).
 */
export function computeCertificateAnchorHash(cert: {
  id: string
  entityId: string
  issuedAt: Date | string
  signatures?: { contextHash: string | null; jti?: string | null }[]
}): string {
  const fromSig = cert.signatures?.[0]?.contextHash ?? cert.signatures?.[0]?.jti
  if (fromSig) return fromSig

  const issuedAt =
    cert.issuedAt instanceof Date ? cert.issuedAt.toISOString() : String(cert.issuedAt)
  return createHash('sha256')
    .update(`${cert.id}:${cert.entityId}:${issuedAt}`)
    .digest('hex')
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
 * Ancre un hash sur Polygon en envoyant une transaction value=0 vers la
 * burn address (ou POLYGON_CONTRACT_ADDRESS si défini), avec le payload
 * `BLOCKTRUST:<certificateId>:<hash>` dans le champ data.
 * On évite explicitement `from === to` (rejeté par certains RPC publics).
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
  const recipient = resolveAnchorRecipient(wallet.address)

  const payload = `BLOCKTRUST:${certificateId}:${hash}`
  const data = ethers.hexlify(ethers.toUtf8Bytes(payload))

  const tx = await wallet.sendTransaction({
    to: recipient,
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
 * Notifie le propriétaire du certificat par email après un ancrage réussi.
 * Fire-and-forget — n'échoue jamais.
 */
export async function notifyAnchorSuccess(
  certificateId: string,
  anchor: AnchorResult,
): Promise<void> {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
      select: {
        id: true,
        publicId: true,
        polygonAnchoredAt: true,
        entity: {
          select: {
            legalName: true,
            tradeName: true,
            firstName: true,
            lastName: true,
            user: {
              select: { email: true, name: true },
            },
          },
        },
      },
    })

    const email = cert?.entity?.user?.email
    if (!email) return

    const userName = cert.entity.user.name?.trim() || 'Utilisateur'
    const entityName =
      cert.entity.legalName?.trim() ||
      cert.entity.tradeName?.trim() ||
      [cert.entity.firstName, cert.entity.lastName].filter(Boolean).join(' ').trim() ||
      'Votre contact'

    const ownerCertKey = cert.publicId ?? certificateId
    const ownerVerifyUrl = buildPublicVerifyUrl(ownerCertKey)
    sendCertificateAnchoredEmail(email, {
      userName,
      entityName,
      verifyUrl: ownerVerifyUrl,
      polygonTxHash: anchor.txHash,
      polygonBlock: anchor.blockNumber,
      polygonExplorerUrl: anchor.explorerUrl,
      anchoredAt: cert.polygonAnchoredAt ?? new Date(),
      ownerCertId: ownerCertKey,
      ownerVerifyUrl,
    })
  } catch (err) {
    console.error('[Polygon] notifyAnchorSuccess error:', (err as Error).message)
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
      issuedAt: true,
      signatures: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: { contextHash: true, jti: true },
      },
    },
  })

  let anchored = 0
  let failed = 0
  const noHash = 0

  for (const cert of candidates) {
    const hash = computeCertificateAnchorHash(cert)
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
      notifyAnchorSuccess(cert.id, anchor).catch(() => undefined)
      anchored += 1
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[Polygon] retry échec', cert.id, ':', message)
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
 * Reprend les ancrages PENDING dont le certificat ACTIVE a plus de `minAgeMs`.
 * Les certificats FAILED sont ignorés (retry manuel admin).
 */
export async function retryStalePendingAnchors(
  max = 25,
  minAgeMs = 60 * 60 * 1000,
): Promise<RetryAnchorsResult> {
  if (!isPolygonConfigured()) {
    return { skipped: true, examined: 0, anchored: 0, failed: 0, noHash: 0 }
  }

  const staleBefore = new Date(Date.now() - minAgeMs)
  const candidates = await prisma.certificate.findMany({
    where: {
      status: 'ACTIVE',
      blockchainStatus: 'PENDING',
      issuedAt: { lt: staleBefore },
    },
    orderBy: { issuedAt: 'asc' },
    take: max,
    select: {
      id: true,
      entityId: true,
      blockchainStatus: true,
      issuedAt: true,
      signatures: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: { contextHash: true, jti: true },
      },
    },
  })

  let anchored = 0
  let failed = 0
  const noHash = 0

  for (const cert of candidates) {
    const hash = computeCertificateAnchorHash(cert)
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
        title: 'Certificat ancré sur Polygon (onboarding agent)',
        description: `TX: ${anchor.txHash} — bloc #${anchor.blockNumber}`,
        entityId: cert.entityId,
        metadata: {
          certificateId: cert.id,
          txHash: anchor.txHash,
          blockNumber: anchor.blockNumber,
          explorerUrl: anchor.explorerUrl,
          via: 'onboarding-monitor',
        },
      }).catch(() => undefined)
      notifyAnchorSuccess(cert.id, anchor).catch(() => undefined)
      anchored += 1
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[Polygon] stale pending retry échec', cert.id, ':', message)
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
