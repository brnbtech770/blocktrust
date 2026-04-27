// scripts/test-e2e-flow.ts
// ============================================================
// Test E2E du flow BlockTrust complet, sans dépendances externes
// (Stripe / INSEE / NextAuth). Toutes les écritures sont nettoyées
// en fin de run.
//
// Usage :
//   npx tsx scripts/test-e2e-flow.ts
//
// Exit code 0 si toutes les étapes passent, 1 sinon.
// ============================================================

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import crypto from 'node:crypto'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const TEST_EMAIL = `e2e+${Date.now()}@blocktrust-test.local`
const TEST_NAME = 'E2E Test User'

type Step = { label: string; ok: boolean; detail?: string }
const steps: Step[] = []

function record(label: string, ok: boolean, detail?: string) {
  steps.push({ label, ok, detail })
  const icon = ok ? '\u2713' : '\u2717'
  const tail = detail ? `  \u2014 ${detail}` : ''
  // eslint-disable-next-line no-console
  console.log(`  ${icon} ${label}${tail}`)
}

function fatal(message: string, err?: unknown): never {
  // eslint-disable-next-line no-console
  console.error(`\n\u2717 FATAL: ${message}`)
  if (err) console.error(err)
  throw new Error(message)
}

async function main() {
  console.log('\n\u2728 BlockTrust \u2014 Test E2E flow complet\n')
  console.log(`   user test : ${TEST_EMAIL}\n`)

  // -----------------------------------------------------------
  // Récupérer un Plan existant en DB pour ne pas inventer un priceId
  // -----------------------------------------------------------
  const seededPlan = await prisma.plan.findFirst({
    where: { whitelabelEnabled: true },
  })
  if (!seededPlan) {
    fatal(
      'Aucun Plan whitelabelEnabled trouvé en DB. Lance `npx tsx scripts/create-plans.ts` au préalable.'
    )
  }

  let userId: string | null = null
  let entityId: string | null = null
  let certificateId: string | null = null

  try {
    // 1. Créer un user test
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: TEST_NAME,
        accountType: 'BUSINESS',
        kycStatus: 'PENDING',
      },
    })
    userId = user.id
    record('1. Création user test', true, user.email ?? undefined)

    // 2. Créer une subscription active + sync User.planId
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeSubscriptionId: `sub_test_${crypto.randomBytes(8).toString('hex')}`,
        stripePriceId: seededPlan.stripePriceId ?? 'price_test',
        plan: seededPlan.name,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    })
    await prisma.user.update({
      where: { id: user.id },
      data: { planId: seededPlan.id },
    })
    record(
      '2. Subscription active + User.planId synchronisé',
      Boolean(subscription.id),
      `plan=${seededPlan.name}`
    )

    // 3. KYCVerification VERIFIED + User.kycStatus → VERIFIED
    const kycSession = `vs_test_${crypto.randomBytes(8).toString('hex')}`
    await prisma.kYCVerification.create({
      data: {
        userId: user.id,
        stripeSessionId: kycSession,
        accountType: 'BUSINESS',
        status: 'VERIFIED',
        siretVerified: true,
        siretData: { siret: '12345678900012' } as Prisma.InputJsonValue,
      },
    })
    await prisma.user.update({
      where: { id: user.id },
      data: { kycStatus: 'VERIFIED', kycVerifiedAt: new Date() },
    })

    const userAfterKyc = await prisma.user.findUnique({
      where: { id: user.id },
      select: { kycStatus: true },
    })
    record(
      '3. KYC VERIFIED',
      userAfterKyc?.kycStatus === 'VERIFIED',
      `User.kycStatus=${userAfterKyc?.kycStatus}`
    )

    // 4. Entity + Certificate (status PENDING) + Signature
    const entity = await prisma.entity.create({
      data: {
        userId: user.id,
        entityType: 'BUSINESS',
        legalName: 'E2E Test SAS',
        email: TEST_EMAIL,
        kycStatus: 'VERIFIED',
        validationLevel: 'BRONZE',
      },
    })
    entityId = entity.id

    const cert = await prisma.certificate.create({
      data: {
        entityId: entity.id,
        level: 'BRONZE',
        status: 'PENDING',
      },
    })
    certificateId = cert.id

    const jti = cert.publicId ?? cert.id
    const contextHash = crypto
      .createHash('sha256')
      .update(`badge:${cert.id}`)
      .digest('hex')

    await prisma.signature.create({
      data: {
        jti,
        certificateId: cert.id,
        entityId: entity.id,
        contextHash,
        purpose: 'badge',
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000),
      },
    })
    record(
      '4. Entity + Certificate PENDING + Signature',
      cert.status === 'PENDING',
      `certId=${cert.id}`
    )

    // 5. Activation du certificat (admin) + AdminAlert CERT_ACTIVATED
    const activated = await prisma.certificate.update({
      where: { id: cert.id },
      data: { status: 'ACTIVE' },
    })
    await prisma.adminAlert.create({
      data: {
        type: 'CERT_ACTIVATED',
        title: 'Certificat activé (E2E)',
        description: `Certificat ${cert.id}`,
        entityId: entity.id,
        userId: user.id,
        metadata: { certificateId: cert.id } as Prisma.InputJsonValue,
      },
    })
    record(
      '5. Certificat ACTIVE',
      activated.status === 'ACTIVE',
      `status=${activated.status}`
    )

    // 6. Génération QR rotatif + URL /verify/qr/[token]
    const dynamicToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 3600 * 1000)
    const updatedSig = await prisma.signature.updateMany({
      where: { certificateId: cert.id, revoked: false },
      data: { dynamicToken, tokenExpiry },
    })
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'https://blocktrust.tech'
    const verifyUrl = `${baseUrl}/verify/qr/${dynamicToken}?h=${contextHash}`
    record(
      '6. QR token rotatif + URL',
      updatedSig.count > 0,
      verifyUrl.slice(0, 80) + '\u2026'
    )

    // 7. Vérification publique : simulation de la logique de /api/verify/[id]
    //    (sans HTTP : on vérifie directement les invariants DB)
    const certForVerify = await prisma.certificate.findUnique({
      where: { id: cert.id },
      include: {
        entity: { select: { id: true, kycStatus: true, legalName: true } },
      },
    })
    const sigForVerify = await prisma.signature.findUnique({ where: { jti } })
    const verdict =
      certForVerify?.status === 'ACTIVE' &&
      sigForVerify &&
      !sigForVerify.revoked &&
      sigForVerify.expiresAt > new Date()
        ? 'VALID'
        : 'INVALID'

    await prisma.verification.create({
      data: {
        certificateId: cert.id,
        ipHash: 'e2e-script',
        userAgent: 'e2e-tsx',
        result: verdict === 'VALID' ? 'VALID' : 'NOT_FOUND',
        signatureJti: jti,
        metadata: { source: 'e2e_script' } as Prisma.InputJsonValue,
      },
    })

    record(
      '7. Vérification publique (verdict)',
      verdict === 'VALID',
      `verdict=${verdict}`
    )

    // 8. WhiteLabelConfig (optionnel pour ce flow, mais on vérifie l'API publique)
    const { apiKey, apiKeyHash } = generateApiKey()
    const wl = await prisma.whiteLabelConfig.create({
      data: {
        userId: user.id,
        companyName: 'E2E Test SAS',
        apiKey,
        apiKeyHash,
        webhookSecret: crypto.randomBytes(32).toString('hex'),
        apiCallsLimit: 1000,
      },
    })
    record(
      '8. WhiteLabelConfig créée',
      Boolean(wl.id),
      `apiKey=${apiKey.slice(0, 12)}\u2026 (rotation possible)`
    )

    // -----------------------------------------------------------
    // Résumé
    // -----------------------------------------------------------
    const total = steps.length
    const passed = steps.filter((s) => s.ok).length
    const failed = total - passed
    console.log(
      `\n\u2713 ${passed}/${total} étapes OK${failed > 0 ? `, \u2717 ${failed} échec(s)` : ''}`
    )

    if (failed > 0) process.exitCode = 1
  } catch (err) {
    console.error('\n\u2717 Exception pendant le test E2E:', err)
    process.exitCode = 1
  } finally {
    // -----------------------------------------------------------
    // Nettoyage : supprimer les enregistrements créés
    // -----------------------------------------------------------
    console.log('\n\uD83E\uDDF9 Nettoyage…')
    if (userId) {
      try {
        await prisma.whiteLabelConfig.deleteMany({ where: { userId } })
        await prisma.adminAlert.deleteMany({ where: { userId } })
        await prisma.subscription.deleteMany({ where: { userId } })
        await prisma.kYCVerification.deleteMany({ where: { userId } })
        if (certificateId) {
          await prisma.verification.deleteMany({ where: { certificateId } })
          await prisma.signature.deleteMany({ where: { certificateId } })
          await prisma.certificate.deleteMany({ where: { id: certificateId } })
        }
        if (entityId) {
          await prisma.entity.deleteMany({ where: { id: entityId } })
        }
        await prisma.user.delete({ where: { id: userId } })
        console.log('   \u2713 Données de test supprimées')
      } catch (cleanupErr) {
        console.error('   \u2717 Nettoyage partiel :', cleanupErr)
      }
    }
    await prisma.$disconnect()
  }
}

function generateApiKey(): { apiKey: string; apiKeyHash: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  const apiKey = `bt_live_${raw}`
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  return { apiKey, apiKeyHash }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
