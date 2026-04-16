// scripts/check-stripe-price.ts
// Vérifie les détails d'un Price ID dans Stripe
// ============================================================

import Stripe from 'stripe'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

async function main() {
  const priceId = 'price_1SzRMBHYadstuPY8opgfvFx0'

  console.log(`🔍 Vérification du Price ID: ${priceId}\n`)

  try {
    const price = await stripe.prices.retrieve(priceId)
    const product = await stripe.products.retrieve(price.product as string)

    console.log('✅ Price trouvé dans Stripe:')
    console.log('  Price ID:', price.id)
    console.log('  Montant:', price.unit_amount! / 100, price.currency.toUpperCase())
    console.log('  Intervalle:', price.recurring?.interval || 'one-time')
    console.log('  Actif:', price.active)
    console.log('')
    console.log('📦 Produit associé:')
    console.log('  Product ID:', product.id)
    console.log('  Nom:', product.name)
    console.log('  Description:', product.description || '(aucune)')
    console.log('')

    // Chercher dans notre base quel plan devrait correspondre
    console.log('🔍 Recherche du plan correspondant...')
    console.log('   Montant:', price.unit_amount! / 100, '€')
    console.log('   Intervalle:', price.recurring?.interval)
    console.log('   Nom produit:', product.name)
  } catch (error: any) {
    console.error('❌ Erreur:', error.message)
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
