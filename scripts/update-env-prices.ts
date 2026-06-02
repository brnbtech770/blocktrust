// scripts/update-env-prices.ts
// Met à jour les variables STRIPE_PRICE_* dans .env.local
// ============================================================

import * as fs from 'fs'
import * as path from 'path'

const envPath = path.join(process.cwd(), '.env.local')

const newPrices = {
  'STRIPE_PRICE_ESSENTIEL_MONTHLY': 'price_1SzRMAHYadstuPY8PodNfss3',
  'STRIPE_PRICE_PREMIUM_MONTHLY': 'price_1SzRMAHYadstuPY8cC4LfhUa',
  'STRIPE_PRICE_FAMILLE_MONTHLY': 'price_1SzRMBHYadstuPY8opgfvFx0',
  'STRIPE_PRICE_ESSENTIEL_YEARLY': 'price_1SzRMCHYadstuPY8LlQrSJ4x',
  'STRIPE_PRICE_PREMIUM_YEARLY': 'price_1SzRMCHYadstuPY8jgyKVwlh',
  'STRIPE_PRICE_FAMILLE_YEARLY': 'price_1SzRMCHYadstuPY8N1SpJkYE',
  'STRIPE_PRICE_STARTER_MONTHLY': 'price_1SzRMDHYadstuPY8FnLtOqp9',
  'STRIPE_PRICE_TEAM_MONTHLY': 'price_1SzRMEHYadstuPY8NwdbMGPX',
  'STRIPE_PRICE_STARTER_YEARLY': 'price_1SzRMEHYadstuPY8vE1K2Tk4',
  'STRIPE_PRICE_TEAM_YEARLY': 'price_1SzRMFHYadstuPY8HaMpoYDl',
}

function main() {
  if (!fs.existsSync(envPath)) {
    console.error('❌ Fichier .env.local non trouvé')
    process.exit(1)
  }

  let content = fs.readFileSync(envPath, 'utf-8')
  const lines = content.split('\n')
  const newLines: string[] = []
  let inStripePricesSection = false
  let stripePricesSectionEnd = -1

  // Parcourir les lignes et identifier la section Stripe Prices
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Détecter le début de la section Stripe Prices
    if (line.includes('# Stripe Prices') || line.includes('# Plans B2C')) {
      inStripePricesSection = true
      stripePricesSectionEnd = i
      continue
    }

    // Si on est dans la section Stripe Prices, ignorer les lignes STRIPE_PRICE_
    if (inStripePricesSection) {
      if (line.startsWith('STRIPE_PRICE_')) {
        continue // Ignorer les anciennes lignes
      }
      // Si on trouve une ligne qui n'est pas STRIPE_PRICE_ et qu'on était dans la section, on sort
      if (line.trim() && !line.startsWith('#')) {
        inStripePricesSection = false
      }
    }

    // Si on n'est pas dans la section Stripe Prices, garder la ligne
    if (!inStripePricesSection || line.trim() === '' || line.startsWith('#')) {
      newLines.push(line)
    }
  }

  // Trouver où insérer les nouvelles variables (après STRIPE_WEBHOOK_SECRET)
  let insertIndex = -1
  for (let i = 0; i < newLines.length; i++) {
    if (newLines[i].startsWith('STRIPE_WEBHOOK_SECRET=')) {
      insertIndex = i + 1
      break
    }
  }

  if (insertIndex === -1) {
    // Si STRIPE_WEBHOOK_SECRET n'est pas trouvé, chercher la fin de la section Stripe
    for (let i = newLines.length - 1; i >= 0; i--) {
      if (newLines[i].includes('STRIPE_')) {
        insertIndex = i + 1
        break
      }
    }
  }

  if (insertIndex === -1) {
    insertIndex = newLines.length
  }

  // Insérer les nouvelles variables
  const pricesSection = [
    '',
    '# Stripe Prices',
    '',
    '# Plans B2C - Mensuel',
    `STRIPE_PRICE_ESSENTIEL_MONTHLY=${newPrices.STRIPE_PRICE_ESSENTIEL_MONTHLY}`,
    `STRIPE_PRICE_PREMIUM_MONTHLY=${newPrices.STRIPE_PRICE_PREMIUM_MONTHLY}`,
    `STRIPE_PRICE_FAMILLE_MONTHLY=${newPrices.STRIPE_PRICE_FAMILLE_MONTHLY}`,
    '',
    '# Plans B2C - Annuel',
    `STRIPE_PRICE_ESSENTIEL_YEARLY=${newPrices.STRIPE_PRICE_ESSENTIEL_YEARLY}`,
    `STRIPE_PRICE_PREMIUM_YEARLY=${newPrices.STRIPE_PRICE_PREMIUM_YEARLY}`,
    `STRIPE_PRICE_FAMILLE_YEARLY=${newPrices.STRIPE_PRICE_FAMILLE_YEARLY}`,
    '',
    '# Plans B2B - Mensuel',
    `STRIPE_PRICE_STARTER_MONTHLY=${newPrices.STRIPE_PRICE_STARTER_MONTHLY}`,
    `STRIPE_PRICE_TEAM_MONTHLY=${newPrices.STRIPE_PRICE_TEAM_MONTHLY}`,
    '',
    '# Plans B2B - Annuel',
    `STRIPE_PRICE_STARTER_YEARLY=${newPrices.STRIPE_PRICE_STARTER_YEARLY}`,
    `STRIPE_PRICE_TEAM_YEARLY=${newPrices.STRIPE_PRICE_TEAM_YEARLY}`,
  ]

  // Insérer la section après STRIPE_WEBHOOK_SECRET
  newLines.splice(insertIndex, 0, ...pricesSection)

  // Écrire le fichier
  fs.writeFileSync(envPath, newLines.join('\n'), 'utf-8')

  console.log('✅ Variables STRIPE_PRICE_* mises à jour dans .env.local')
  console.log(`   ${Object.keys(newPrices).length} variables ajoutées/mises à jour`)
}

main()
