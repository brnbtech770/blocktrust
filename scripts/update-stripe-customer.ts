import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { config } from 'dotenv'
import { resolve } from 'path'

// Charger les variables d'environnement depuis .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY n\'est pas défini dans .env.local')
  process.exit(1)
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2026-01-28.clover',
})

async function main() {
  console.log('\n🔍 Recherche du customer Stripe pour olivier@blocktrust.tech...\n')

  try {
    // Rechercher le customer Stripe par email
    const customers = await stripe.customers.list({
      email: 'olivier@blocktrust.tech',
      limit: 10,
    })

    if (customers.data.length === 0) {
      console.log('❌ Aucun customer Stripe trouvé pour olivier@blocktrust.tech')
      console.log('\n💡 Essayons de lister tous les customers...\n')
      
      // Lister tous les customers pour voir ce qui existe
      const allCustomers = await stripe.customers.list({
        limit: 20,
      })
      
      console.log(`📋 ${allCustomers.data.length} customers trouvés:`)
      allCustomers.data.forEach((customer, index) => {
        console.log(`   ${index + 1}. ${customer.email || 'Pas d\'email'} - ID: ${customer.id}`)
      })
      
      await prisma.$disconnect()
      return
    }

    const customer = customers.data[0]
    console.log(`✅ Customer Stripe trouvé:`)
    console.log(`   ID: ${customer.id}`)
    console.log(`   Email: ${customer.email}`)
    console.log(`   Nom: ${customer.name || 'Non renseigné'}`)
    console.log(`   Créé le: ${new Date(customer.created * 1000).toLocaleString('fr-FR')}\n`)

    // Mettre à jour l'utilisateur dans la base de données
    console.log('🔄 Mise à jour de l\'utilisateur olivier@brnb.fr...\n')
    
    const updatedUser = await prisma.user.update({
      where: { email: 'olivier@brnb.fr' },
      data: { stripeCustomerId: customer.id },
    })

    console.log('✅ Utilisateur mis à jour avec succès!')
    console.log(`   Email: ${updatedUser.email}`)
    console.log(`   stripeCustomerId: ${updatedUser.stripeCustomerId}`)
    console.log(`   PlanId: ${updatedUser.planId || 'Aucun'}\n`)

    // Vérifier que la mise à jour a bien fonctionné
    const verifyUser = await prisma.user.findUnique({
      where: { email: 'olivier@brnb.fr' },
      select: {
        email: true,
        stripeCustomerId: true,
        planId: true,
        plan: {
          select: {
            name: true,
            type: true,
          },
        },
      },
    })

    console.log('🔍 Vérification:')
    console.log(JSON.stringify(verifyUser, null, 2))

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Erreur:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

main()
