// lib/stripe-webhook-idempotency.ts
// Idempotence des webhooks Stripe via la BASE DE DONNÉES (table ProcessedStripeEvent,
// clé primaire unique sur eventId). Cas financier critique : on préfère la DB au
// cache Redis car la contrainte unique rend le double-traitement IMPOSSIBLE, même
// si Redis tombe.
// ============================================================
//
// Modèle « claim » atomique :
//   - stripeWebhookAlreadyHandled() tente un INSERT.
//       • succès → l'événement est réclamé pour la 1ère fois (return false).
//       • conflit unique (P2002) → déjà traité (return true) → à ignorer.
//       • autre erreur DB → on PROPAGE (le webhook renverra 500, Stripe rejouera).
//   - si le traitement échoue ensuite, stripeWebhookReleaseClaim() supprime la
//     réclamation pour permettre à Stripe de rejouer l'événement.

import { prisma } from '@/app/lib/db'

/** P2002 = violation de contrainte unique (Prisma). */
function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: string }).code === 'P2002'
  )
}

/**
 * Réclame l'événement de façon atomique. Retourne true s'il a DÉJÀ été traité
 * (insert en conflit), false si c'est la première fois (réclamation effectuée).
 * Toute autre erreur DB est propagée → le webhook répond 500 et Stripe rejoue
 * (jamais de fail-open silencieux qui laisserait passer un double-traitement).
 */
export async function stripeWebhookAlreadyHandled(
  eventId: string,
  type?: string,
): Promise<boolean> {
  try {
    await prisma.processedStripeEvent.create({
      data: { eventId, type: type ?? null },
    })
    return false
  } catch (e) {
    if (isUniqueViolation(e)) return true
    throw e
  }
}

/**
 * Conservé pour compatibilité : la réclamation atomique a déjà persisté la ligne,
 * il n'y a donc plus rien à marquer après un traitement réussi.
 */
export async function stripeWebhookMarkHandled(_eventId: string): Promise<void> {
  // no-op : l'insert dans stripeWebhookAlreadyHandled fait foi.
}

/**
 * Libère la réclamation (supprime la ligne) lorsque le traitement a échoué, afin
 * que Stripe puisse rejouer l'événement et qu'il soit re-traité.
 */
export async function stripeWebhookReleaseClaim(eventId: string): Promise<void> {
  try {
    await prisma.processedStripeEvent.deleteMany({ where: { eventId } })
  } catch (err) {
    console.warn('[stripe] libération réclamation idempotence KO', err)
  }
}
