# Configuration Stripe pour BlockTrust

## Variables d'environnement requises

Ajoutez ces variables dans votre fichier `.env.local` :

```env
# Clés Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Price IDs Stripe (à créer dans le dashboard Stripe)
STRIPE_PRICE_ESSENTIEL="price_..."
STRIPE_PRICE_PREMIUM="price_..."
STRIPE_PRICE_FAMILLE="price_..."
STRIPE_PRICE_FAMILLE_PLUS="price_..."

# URL de l'application
NEXT_PUBLIC_APP_URL="https://blocktrust.tech"
```

## Création des Price IDs dans Stripe

1. Connectez-vous à votre [dashboard Stripe](https://dashboard.stripe.com)
2. Allez dans **Produits** → **Créer un produit**
3. Créez 4 produits avec leurs prix :

### Plan Essentiel
- **Nom** : BlockTrust Essentiel
- **Prix** : 3,99€ / mois (recurring)
- **Copiez le Price ID** → `STRIPE_PRICE_ESSENTIEL`

### Plan Premium
- **Nom** : BlockTrust Premium
- **Prix** : 9,99€ / mois (recurring)
- **Copiez le Price ID** → `STRIPE_PRICE_PREMIUM`

### Plan Famille
- **Nom** : BlockTrust Famille
- **Prix** : 14,99€ / mois (recurring)
- **Copiez le Price ID** → `STRIPE_PRICE_FAMILLE`

### Plan Famille+
- **Nom** : BlockTrust Famille+
- **Prix** : 24,99€ / mois (recurring)
- **Copiez le Price ID** → `STRIPE_PRICE_FAMILLE_PLUS`

## Configuration du Webhook Stripe

1. Allez dans **Développeurs** → **Webhooks** → **Ajouter un endpoint**
2. **URL** : `https://blocktrust.tech/api/stripe/webhook`
3. **Événements à écouter** :
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
4. **Copiez le Webhook Secret** → `STRIPE_WEBHOOK_SECRET`

## Test en mode développement

Pour tester en local avec Stripe CLI :

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Se connecter
stripe login

# Forwarder les webhooks vers localhost
stripe listen --forward-to localhost:3004/api/stripe/webhook

# Copier le webhook secret affiché dans .env.local
```

## Migration Prisma

Après avoir configuré les variables d'environnement, exécutez :

```bash
npx prisma migrate dev --name add_subscription
npx prisma generate
```

## Vérification

1. Testez le checkout : `/pricing` → Choisir un plan
2. Vérifiez que la subscription est créée en DB après le paiement
3. Testez le portail client : `/dashboard/subscription` → "Gérer mon abonnement"
