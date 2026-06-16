/**
 * Ambassadeur BLOCKTRUST™ — entité marque + certificat signé + ancrage Polygon.
 * Idempotent — safe à relancer.
 *
 * Exécution : npx tsx scripts/create-blocktrust-entity.ts
 * Optionnel  : SKIP_ANCHOR=1 pour créer sans ancrage Polygon.
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { ensureAdminCapabilities } from '@/lib/admin-bootstrap'
import {
  anchorBlocktrustSiteCertificate,
  BLOCKTRUST_SITE_ENTITY,
  ensureBlocktrustSiteEntityAndCertificate,
} from '@/lib/blocktrust-site-cert'
import { SUPER_ADMIN_EMAIL } from '@/lib/admin-utils'
import { prisma } from '@/app/lib/db'

async function createBlocktrustEntity() {
  console.log('\n🏷️  BLOCKTRUST™ ambassadeur — entité + certificat + ancrage\n')

  const owner = await prisma.user.findFirst({
    where: { email: { equals: SUPER_ADMIN_EMAIL, mode: 'insensitive' } },
    select: { id: true, email: true, name: true },
  })

  if (!owner?.email) {
    console.error(`Utilisateur introuvable : ${SUPER_ADMIN_EMAIL}`)
    process.exit(1)
  }

  console.log(`Propriétaire : ${owner.email}`)
  await ensureAdminCapabilities(owner.id, owner.email, owner.name)
  console.log('  Capabilities Enterprise OK\n')

  const result = await ensureBlocktrustSiteEntityAndCertificate()

  console.log(
    result.createdEntity
      ? `✅ Entity créée : ${BLOCKTRUST_SITE_ENTITY.legalName}`
      : `✓ Entity existante : ${BLOCKTRUST_SITE_ENTITY.legalName}`,
  )
  console.log(`   id=${result.entityId}`)
  console.log(`   email=${BLOCKTRUST_SITE_ENTITY.email}`)
  console.log(`   domain=${BLOCKTRUST_SITE_ENTITY.domain}`)

  console.log(
    result.createdCertificate
      ? '\n✅ Certificat créé (ACTIVE, signature ES256 badge)'
      : '\n✓ Certificat existant réutilisé',
  )
  console.log(`   certificateId=${result.certificateId}`)
  console.log(`   publicCertId=${result.publicCertId}`)
  console.log(`   verifyUrl=${result.verifyUrl}`)

  const skipAnchor = process.env.SKIP_ANCHOR === '1'

  if (skipAnchor) {
    console.log('\n⏭️  SKIP_ANCHOR=1 — ancrage Polygon ignoré')
  } else {
    console.log('\n⛓️  Ancrage Polygon…')
    try {
      const anchor = await anchorBlocktrustSiteCertificate(result.certificateId)
      if (anchor.alreadyAnchored) {
        console.log(`✓ Déjà ancré — txHash=${anchor.txHash}`)
      } else {
        console.log(`✅ Ancré — txHash=${anchor.txHash}`)
      }
      if (anchor.explorerUrl) {
        console.log(`   PolygonScan : ${anchor.explorerUrl}`)
      }
    } catch (e) {
      console.error('❌ Ancrage échoué :', e instanceof Error ? e.message : e)
      console.error(
        '   Relancez le script après configuration POLYGON_RPC_URL + POLYGON_PRIVATE_KEY',
      )
      process.exit(1)
    }
  }

  console.log('\n📋 Variables d’environnement recommandées :')
  console.log(`   BLOCKTRUST_SITE_CERT_ID=${result.publicCertId}`)
  console.log(`   NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID=${result.publicCertId}`)
  console.log('')
}

createBlocktrustEntity()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
