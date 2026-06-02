/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
// lib/stripe.ts
// Client Stripe — initialisation **lazy** pour ne pas faire échouer `next build`
// quand STRIPE_SECRET_KEY est absent (ex. preview Vercel / PR Dependabot sans secrets).
// L’erreur n’est levée qu’à l’appel réel à l’API Stripe.
// ============================================================

import Stripe from 'stripe'

let stripeSingleton: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  }
  return stripeSingleton
}

/** Accès paresseux ; même surface API que le client Stripe (compat imports existants). */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver)
  },
})

// Export pour usage côté client (optionnel)
export { loadStripe } from '@stripe/stripe-js'
