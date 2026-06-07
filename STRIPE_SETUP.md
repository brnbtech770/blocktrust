# Configuration Stripe pour BLOCKTRUST

Grille de vente courante : **`lib/pricing.ts`** (juin 2026).

## Variables d'environnement requises

```env
# Clés Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# B2C — mensuel + annuel
STRIPE_PRICE_ESSENTIEL_MONTHLY="price_..."
STRIPE_PRICE_ESSENTIEL_YEARLY="price_..."
STRIPE_PRICE_PREMIUM_MONTHLY="price_..."
STRIPE_PRICE_PREMIUM_YEARLY="price_..."
STRIPE_PRICE_FAMILLE_MONTHLY="price_..."
STRIPE_PRICE_FAMILLE_YEARLY="price_..."

# Add-on Famille (profils supplémentaires)
STRIPE_PRICE_FAMILLE_ADDON_MONTHLY="price_..."
STRIPE_PRICE_FAMILLE_ADDON_YEARLY="price_..."

# B2B — mensuel + annuel (Team facturé par siège)
STRIPE_PRICE_STARTER_MONTHLY="price_..."
STRIPE_PRICE_STARTER_YEARLY="price_..."
STRIPE_PRICE_TEAM_MONTHLY="price_..."
STRIPE_PRICE_TEAM_YEARLY="price_..."

# URL de l'application
NEXT_PUBLIC_APP_URL="https://blocktrust.tech"
```

### Variables legacy (optionnelles — rétro-compat uniquement)

Conservées pour webhook / MRR admin des **abonnés existants**.  
**Non souscriptibles** (`isLegacyPriceId` bloque le checkout).

```env
STRIPE_PRICE_FAMILLE_PLUS_MONTHLY="price_..."
STRIPE_PRICE_FAMILLE_PLUS_YEARLY="price_..."
STRIPE_PRICE_SOLO_PRO_MONTHLY="price_..."
STRIPE_PRICE_SOLO_PRO_YEARLY="price_..."
STRIPE_PRICE_BUSINESS_MONTHLY="price_..."
STRIPE_PRICE_BUSINESS_YEARLY="price_..."
```

## Grille à créer dans Stripe Dashboard

| Plan | Mensuel | Annuel (−20 %) |
|------|---------|----------------|
| Essentiel | 3,99 € TTC | 35,88 € TTC |
| Premium | 6,99 € TTC | 59,88 € TTC |
| Famille | 17,99 € TTC | 179,88 € TTC |
| Starter (B2B) | 12,99 € HT/user | 119,88 € HT/user |
| Team (B2B) | 8,99 € HT/user | 83,88 € HT/user |

Enterprise : sur devis (pas de Price ID checkout).

## Configuration du Webhook Stripe

1. **Développeurs** → **Webhooks** → **Ajouter un endpoint**
2. **URL** : `https://blocktrust.tech/api/stripe/webhook`
3. **Événements** :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. **Webhook Secret** → `STRIPE_WEBHOOK_SECRET`

## Test en local (Stripe CLI)

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3004/api/stripe/webhook
```

## Scripts utiles

```bash
# Seed Stripe (dev/test) — aligné lib/pricing.ts
npx tsx scripts/stripe-seed.ts

# Seed table Prisma Plan
npx tsx scripts/create-plans.ts
```

## Vérification

1. `/pricing` → checkout d'un plan courant (Essentiel, Premium, Team…)
2. Vérifier que les Price IDs legacy **refusent** le checkout (410)
3. Webhook : subscription active en DB après paiement test
