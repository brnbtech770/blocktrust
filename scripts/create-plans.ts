// scripts/create-plans.ts
// Crée les Plans dans Prisma et les lie aux priceIds Stripe
// ============================================================

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { PrismaClient, PlanType, BillingInterval } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Création des Plans dans la base de données...\n')

  // Récupérer les priceIds depuis .env.local
  const priceIds = {
    ESSENTIEL_MONTHLY: process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY,
    ESSENTIEL_YEARLY: process.env.STRIPE_PRICE_ESSENTIEL_YEARLY,
    PREMIUM_MONTHLY: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    PREMIUM_YEARLY: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    FAMILLE_MONTHLY: process.env.STRIPE_PRICE_FAMILLE_MONTHLY,
    FAMILLE_YEARLY: process.env.STRIPE_PRICE_FAMILLE_YEARLY,
    FAMILLE_PLUS_MONTHLY: process.env.STRIPE_PRICE_FAMILLE_PLUS_MONTHLY,
    FAMILLE_PLUS_YEARLY: process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY,
    STARTER_MONTHLY: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    STARTER_YEARLY: process.env.STRIPE_PRICE_STARTER_YEARLY,
    TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY,
    TEAM_YEARLY: process.env.STRIPE_PRICE_TEAM_YEARLY,
    BUSINESS_MONTHLY: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
    BUSINESS_YEARLY: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
  }

  // Vérifier que tous les priceIds sont définis
  const missing = Object.entries(priceIds).filter(([_, value]) => !value)
  if (missing.length > 0) {
    console.error('❌ PriceIds manquants dans .env.local:')
    missing.forEach(([key]) => console.error(`   - ${key}`))
    process.exit(1)
  }

  // Définir les plans avec leurs caractéristiques
  const plans = [
    // B2C ESSENTIEL
    {
      name: 'Essentiel',
      type: PlanType.B2C_ESSENTIEL,
      price: 4.99,
      interval: BillingInterval.MONTHLY,
      maxProfiles: 1,
      maxEntities: 1,
      maxSeats: 1,
      maxCertificates: 1,
      apiRequestsPerMonth: 500,
      trustCircleEnabled: false,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: false,
      prioritySupport: false,
      stripePriceId: priceIds.ESSENTIEL_MONTHLY!,
    },
    {
      name: 'Essentiel (Annuel)',
      type: PlanType.B2C_ESSENTIEL,
      price: 47.90,
      interval: BillingInterval.YEARLY,
      maxProfiles: 1,
      maxEntities: 1,
      maxSeats: 1,
      maxCertificates: 1,
      apiRequestsPerMonth: 500,
      trustCircleEnabled: false,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: false,
      prioritySupport: false,
      stripePriceId: priceIds.ESSENTIEL_YEARLY!,
    },
    // B2C PREMIUM
    {
      name: 'Premium',
      type: PlanType.B2C_PREMIUM,
      price: 9.99,
      interval: BillingInterval.MONTHLY,
      maxProfiles: 1,
      maxEntities: 5,
      maxSeats: 1,
      maxCertificates: 5,
      apiRequestsPerMonth: 2000,
      trustCircleEnabled: false,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: false,
      prioritySupport: false,
      stripePriceId: priceIds.PREMIUM_MONTHLY!,
    },
    {
      name: 'Premium (Annuel)',
      type: PlanType.B2C_PREMIUM,
      price: 95.90,
      interval: BillingInterval.YEARLY,
      maxProfiles: 1,
      maxEntities: 5,
      maxSeats: 1,
      maxCertificates: 5,
      apiRequestsPerMonth: 2000,
      trustCircleEnabled: false,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: false,
      prioritySupport: false,
      stripePriceId: priceIds.PREMIUM_YEARLY!,
    },
    // B2C FAMILLE
    {
      name: 'Famille',
      type: PlanType.B2C_FAMILLE,
      price: 14.99,
      interval: BillingInterval.MONTHLY,
      maxProfiles: 5,
      maxEntities: 10,
      maxSeats: 5,
      maxCertificates: 10,
      apiRequestsPerMonth: 5000,
      trustCircleEnabled: true,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: false,
      prioritySupport: false,
      stripePriceId: priceIds.FAMILLE_MONTHLY!,
    },
    {
      name: 'Famille (Annuel)',
      type: PlanType.B2C_FAMILLE,
      price: 143.90,
      interval: BillingInterval.YEARLY,
      maxProfiles: 5,
      maxEntities: 10,
      maxSeats: 5,
      maxCertificates: 10,
      apiRequestsPerMonth: 5000,
      trustCircleEnabled: true,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: false,
      prioritySupport: false,
      stripePriceId: priceIds.FAMILLE_YEARLY!,
    },
    // B2C FAMILLE_PLUS
    {
      name: 'Famille+',
      type: PlanType.B2C_FAMILLE_PLUS,
      price: 24.99,
      interval: BillingInterval.MONTHLY,
      maxProfiles: 999999,
      maxEntities: 999999,
      maxSeats: 999999,
      maxCertificates: 999999,
      apiRequestsPerMonth: 999999,
      trustCircleEnabled: true,
      blockchainAnchor: true,
      whitelabelEnabled: false,
      aiAlertsEnabled: true,
      prioritySupport: false,
      stripePriceId: priceIds.FAMILLE_PLUS_MONTHLY!,
    },
    {
      name: 'Famille+ (Annuel)',
      type: PlanType.B2C_FAMILLE_PLUS,
      price: 239.90,
      interval: BillingInterval.YEARLY,
      maxProfiles: 999999,
      maxEntities: 999999,
      maxSeats: 999999,
      maxCertificates: 999999,
      apiRequestsPerMonth: 999999,
      trustCircleEnabled: true,
      blockchainAnchor: true,
      whitelabelEnabled: false,
      aiAlertsEnabled: true,
      prioritySupport: false,
      stripePriceId: priceIds.FAMILLE_PLUS_YEARLY!,
    },
    // B2B STARTER
    {
      name: 'Starter',
      type: PlanType.B2B_STARTER,
      price: 29,
      interval: BillingInterval.MONTHLY,
      maxProfiles: 1,
      maxEntities: 10,
      maxSeats: 3,
      maxCertificates: 10,
      apiRequestsPerMonth: 1000,
      trustCircleEnabled: false,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: false,
      prioritySupport: false,
      stripePriceId: priceIds.STARTER_MONTHLY!,
    },
    {
      name: 'Starter (Annuel)',
      type: PlanType.B2B_STARTER,
      price: 278.40,
      interval: BillingInterval.YEARLY,
      maxProfiles: 1,
      maxEntities: 10,
      maxSeats: 3,
      maxCertificates: 10,
      apiRequestsPerMonth: 1000,
      trustCircleEnabled: false,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: false,
      prioritySupport: false,
      stripePriceId: priceIds.STARTER_YEARLY!,
    },
    // B2B TEAM
    {
      name: 'Team',
      type: PlanType.B2B_TEAM,
      price: 59,
      interval: BillingInterval.MONTHLY,
      maxProfiles: 1,
      maxEntities: 50,
      maxSeats: 10,
      maxCertificates: 50,
      apiRequestsPerMonth: 10000,
      trustCircleEnabled: true,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: true,
      prioritySupport: false,
      stripePriceId: priceIds.TEAM_MONTHLY!,
    },
    {
      name: 'Team (Annuel)',
      type: PlanType.B2B_TEAM,
      price: 566.40,
      interval: BillingInterval.YEARLY,
      maxProfiles: 1,
      maxEntities: 50,
      maxSeats: 10,
      maxCertificates: 50,
      apiRequestsPerMonth: 10000,
      trustCircleEnabled: true,
      blockchainAnchor: false,
      whitelabelEnabled: false,
      aiAlertsEnabled: true,
      prioritySupport: false,
      stripePriceId: priceIds.TEAM_YEARLY!,
    },
    // B2B BUSINESS
    {
      name: 'Business',
      type: PlanType.B2B_BUSINESS,
      price: 149,
      interval: BillingInterval.MONTHLY,
      maxProfiles: 1,
      maxEntities: 999999,
      maxSeats: 999999,
      maxCertificates: 999999,
      apiRequestsPerMonth: 999999,
      trustCircleEnabled: true,
      blockchainAnchor: true,
      whitelabelEnabled: true,
      aiAlertsEnabled: true,
      prioritySupport: true,
      stripePriceId: priceIds.BUSINESS_MONTHLY!,
    },
    {
      name: 'Business (Annuel)',
      type: PlanType.B2B_BUSINESS,
      price: 1430.40,
      interval: BillingInterval.YEARLY,
      maxProfiles: 1,
      maxEntities: 999999,
      maxSeats: 999999,
      maxCertificates: 999999,
      apiRequestsPerMonth: 999999,
      trustCircleEnabled: true,
      blockchainAnchor: true,
      whitelabelEnabled: true,
      aiAlertsEnabled: true,
      prioritySupport: true,
      stripePriceId: priceIds.BUSINESS_YEARLY!,
    },
  ]

  console.log(`📦 Création de ${plans.length} plans...\n`)

  for (const planData of plans) {
    try {
      // Vérifier si le plan existe déjà
      const existing = planData.stripePriceId
        ? await prisma.plan.findUnique({
            where: { stripePriceId: planData.stripePriceId },
          })
        : await prisma.plan.findFirst({
            where: {
              type: planData.type,
              interval: planData.interval,
            },
          })

      if (existing) {
        console.log(`⏭️  Plan ${planData.name} existe déjà (ID: ${existing.id})`)
        continue
      }

      const plan = await prisma.plan.create({
        data: planData,
      })

      console.log(`✅ Plan créé: ${plan.name} (${plan.type} - ${plan.interval}) - ID: ${plan.id}`)
    } catch (error: any) {
      console.error(`❌ Erreur création plan ${planData.name}:`, error.message)
    }
  }

  console.log('\n✨ Tous les plans ont été créés avec succès!')
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
