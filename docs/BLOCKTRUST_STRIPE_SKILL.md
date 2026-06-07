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

### Variables d'environnement (grille courante — source `lib/pricing.ts`)

```bash
# B2C — souscriptibles
STRIPE_PRICE_ESSENTIEL_MONTHLY=price_xxx
STRIPE_PRICE_ESSENTIEL_YEARLY=price_xxx
STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
STRIPE_PRICE_PREMIUM_YEARLY=price_xxx
STRIPE_PRICE_FAMILLE_MONTHLY=price_xxx
STRIPE_PRICE_FAMILLE_YEARLY=price_xxx
STRIPE_PRICE_FAMILLE_ADDON_MONTHLY=price_xxx
STRIPE_PRICE_FAMILLE_ADDON_YEARLY=price_xxx

# B2B — souscriptibles
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_YEARLY=price_xxx
STRIPE_PRICE_TEAM_MONTHLY=price_xxx
STRIPE_PRICE_TEAM_YEARLY=price_xxx
```

**Legacy (optionnel — rétro-compat webhook/MRR, non souscriptible)** :  
`STRIPE_PRICE_FAMILLE_PLUS_*`, `STRIPE_PRICE_SOLO_PRO_*`, `STRIPE_PRICE_BUSINESS_*`

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

## 3. GRILLE TARIFAIRE (juin 2026)

Source unique : **`lib/pricing.ts`**.

| Plan | Mensuel | Annuel (−20 %) |
|------|---------|----------------|
| Essentiel | 3,99 € TTC | 35,88 € |
| Premium | 6,99 € TTC | 59,88 € |
| Famille | 17,99 € TTC | 179,88 € |
| Starter | 12,99 € HT/user | 119,88 € HT/user |
| Team | 8,99 € HT/user | 83,88 € HT/user |

Team : facturé par siège (`quantity` checkout, 2–10 users).

Legacy non souscriptible : Famille+, Solo Pro, Business.

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
    // legacy — rétro-compat uniquement (non souscriptible)
    [process.env.STRIPE_PRICE_SOLO_PRO_MONTHLY!]: 'SOLO_PRO',
    [process.env.STRIPE_PRICE_SOLO_PRO_YEARLY!]: 'SOLO_PRO',
    [process.env.STRIPE_PRICE_STARTER_MONTHLY!]: 'STARTER',
    [process.env.STRIPE_PRICE_STARTER_YEARLY!]: 'STARTER',
    // etc.
  }
  return mapping[priceId] ?? 'DISCOVERY' // priceId inconnu → pas de droits payants
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
