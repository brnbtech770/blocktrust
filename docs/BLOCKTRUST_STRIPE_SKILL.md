# BLOCKTRUST — Skill Stripe
## Paiements, abonnements, pricing dégressif

---

## 1. CONFIGURATION DE BASE

### Initialisation lazy (obligatoire)
```typescript
// lib/stripe.ts — TOUJOURS lazy init
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY manquant')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  }
  return _stripe
}
```

---

## 2. PRICE IDS BLOCKTRUST

### Variables d'environnement requises
```bash
# B2C
STRIPE_PRICE_ESSENTIEL_MONTHLY=price_xxx
STRIPE_PRICE_ESSENTIEL_YEARLY=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
STRIPE_PRICE_PREMIUM_YEARLY=price_xxx
STRIPE_PRICE_FAMILLE_MONTHLY=price_xxx
STRIPE_PRICE_FAMILLE_YEARLY=price_xxx
STRIPE_PRICE_FAMILLE_PLUS_MONTHLY=price_xxx
STRIPE_PRICE_FAMILLE_PLUS_YEARLY=price_xxx

# B2B
STRIPE_PRICE_SOLO_PRO_MONTHLY=price_xxx
STRIPE_PRICE_SOLO_PRO_YEARLY=price_xxx
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_TEAM_MONTHLY=price_xxx
STRIPE_PRICE_TEAM_YEARLY=price_xxx
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxx
STRIPE_PRICE_BUSINESS_YEARLY=price_xxx
```

### Créer un Price ID dans Stripe Dashboard
```
Products → Add product
→ Name : BLOCKTRUST [Plan]
→ Pricing : Recurring
→ Amount : [prix en centimes]
→ Currency : EUR
→ Billing period : Monthly ou Yearly
→ Save → copier le Price ID
```

---

## 3. PRICING DÉGRESSIF PAR USER (B2B)

### Prix dégressifs par tranche
```typescript
export function getPricePerUser(userCount: number): number {
  if (userCount === 1) return 9.99      // Solo Pro
  if (userCount <= 5) return 8.99       // Starter
  if (userCount <= 15) return 7.99      // Team
  if (userCount <= 50) return 5.99      // Business
  return 0 // Enterprise sur devis
}
```

### Toggle annuel (-20%)
```typescript
export function getYearlyPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * 0.8 * 100) / 100
}
```

---

## 4. STRIPE TAX

### Dans le checkout
```typescript
const session = await stripe.checkout.sessions.create({
  automatic_tax: { enabled: true },
  tax_id_collection: { enabled: true }, // pour B2B
})
```

### Affichage HT/TTC
```typescript
const displayPrice = isBusiness 
  ? `${priceHT}€ HT/user/mois · TVA 20% en sus`
  : `${priceTTC}€ TTC/mois`
```

---

## 5. WEBHOOKS

### Vérification signature (obligatoire)
```typescript
const sig = request.headers.get('stripe-signature')!
const body = await request.text()
let event: Stripe.Event
try {
  event = stripe.webhooks.constructEvent(
    body, sig, process.env.STRIPE_WEBHOOK_SECRET!
  )
} catch {
  return new Response('Invalid signature', { status: 400 })
}
```

### Idempotence Redis (obligatoire)
```typescript
const eventKey = `stripe:event:${event.id}`
const already = await redis?.get(eventKey)
if (already) return Response.json({ received: true })
await processStripeEvent(event)
await redis?.set(eventKey, '1', { ex: 86400 })
```

### Événements à écouter
```typescript
switch (event.type) {
  case 'checkout.session.completed':      // Activer abonnement
  case 'customer.subscription.updated':   // Mettre à jour plan
  case 'customer.subscription.deleted':   // Désactiver abonnement
  case 'invoice.payment_failed':          // Notifier utilisateur
  case 'identity.verification_session.verified':    // KYC OK
  case 'identity.verification_session.requires_input': // KYC KO
}
```

---

## 6. MAPPING PRICE IDS → PLANS

```typescript
export function getPlanFromPriceId(priceId: string): string {
  const mapping: Record<string, string> = {
    [process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY!]: 'ESSENTIEL',
    [process.env.STRIPE_PRICE_ESSENTIEL_YEARLY!]: 'ESSENTIEL',
    [process.env.STRIPE_PRICE_SOLO_PRO_MONTHLY!]: 'SOLO_PRO',
    [process.env.STRIPE_PRICE_SOLO_PRO_YEARLY!]: 'SOLO_PRO',
    [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: 'STARTER',
    [process.env.STRIPE_PRICE_STARTER_YEARLY!]: 'STARTER',
    // etc.
  }
  return mapping[priceId] ?? 'ESSENTIEL'
}
```

---

## 7. ANTI-PATTERNS

```typescript
// ❌ Import Stripe au niveau module → crash au build sans clé
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// ✅ Toujours lazy init
const stripe = getStripe()

// ❌ Pas de vérification signature webhook
const body = await request.json()

// ✅ Toujours vérifier la signature
const body = await request.text()
stripe.webhooks.constructEvent(body, sig, secret)
```

*Document généré le 7 mai 2026 — BLOCKTRUST Stripe Skill*
