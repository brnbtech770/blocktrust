/**
 * Backfill : certificats des comptes en plan effectif DISCOVERY → non ancrés.
 * - blockchainStatus = NOT_ANCHORED
 * - polygonTxHash et txHash supprimés (null)
 *
 * Idempotent — safe à relancer.
 * Exécution : npx tsx scripts/backfill-discovery-not-anchored.ts
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { prisma } from '@/app/lib/db'
import {
  BLOCKCHAIN_STATUS_NOT_ANCHORED,
  isDiscoveryPlan,
  resolveEffectivePlan,
} from '@/lib/plan-features'

function certRef(id: string): string {
  return id.slice(0, 8)
}

function needsCleanup(cert: {
  blockchainStatus: string
  polygonTxHash: string | null
  txHash: string | null
}): boolean {
  return (
    cert.blockchainStatus !== BLOCKCHAIN_STATUS_NOT_ANCHORED ||
    cert.polygonTxHash != null ||
    cert.txHash != null
  )
}

async function backfillDiscoveryNotAnchored() {
  console.log('\n⛓️  Backfill Découverte → NOT_ANCHORED\n')

  const certificates = await prisma.certificate.findMany({
    select: {
      id: true,
      blockchainStatus: true,
      polygonTxHash: true,
      txHash: true,
      entity: {
        select: {
          user: {
            select: {
              email: true,
              subscription: {
                select: {
                  plan: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  })

  let discoveryTotal = 0
  let cleaned = 0
  let alreadyOk = 0
  let skippedNonDiscovery = 0

  for (const cert of certificates) {
    const user = cert.entity.user
    const effectivePlan = resolveEffectivePlan({
      subscription: user.subscription,
      email: user.email,
    })

    if (!isDiscoveryPlan(effectivePlan)) {
      skippedNonDiscovery += 1
      continue
    }

    discoveryTotal += 1

    if (!needsCleanup(cert)) {
      alreadyOk += 1
      continue
    }

    const prevStatus = cert.blockchainStatus
    const prevPolygon = cert.polygonTxHash ? `${cert.polygonTxHash.slice(0, 10)}…` : 'null'
    const prevTx = cert.txHash ? `${cert.txHash.slice(0, 10)}…` : 'null'

    await prisma.certificate.update({
      where: { id: cert.id },
      data: {
        blockchainStatus: BLOCKCHAIN_STATUS_NOT_ANCHORED,
        polygonTxHash: null,
        txHash: null,
      },
    })

    cleaned += 1
    console.log(
      `[cleaned] cert=${certRef(cert.id)}… user=${user.email ?? '—'} plan=${effectivePlan} ` +
        `was status=${prevStatus} polygonTxHash=${prevPolygon} txHash=${prevTx} → NOT_ANCHORED`,
    )
  }

  console.log(
    `\nTerminé — ${cleaned} nettoyé(s), ${alreadyOk} déjà conforme(s), ` +
      `${discoveryTotal} certificat(s) Découverte, ${skippedNonDiscovery} ignoré(s) (plan payant)\n`,
  )
}

backfillDiscoveryNotAnchored()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
