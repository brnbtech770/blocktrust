// lib/pricing.ts
// Plans B2C officiels BlockTrust — utilisé par pricing page et create-checkout
// ============================================================

export type PlanFeature = { label: string; included: boolean }

export type PlanDefinition = {
  id: 'ESSENTIEL' | 'PREMIUM' | 'FAMILLE' | 'FAMILLE_PLUS'
  name: string
  price: number
  priceId: string
  profiles: number
  entities: number
  level: string
  highlighted: boolean
  features: PlanFeature[]
}

/**
 * Retourne les plans avec les Price IDs Stripe (à appeler côté serveur uniquement).
 * Utilisé par app/api/stripe/create-checkout et GET /api/pricing.
 */
export function getPlansServer(): PlanDefinition[] {
  return [
    {
      id: 'ESSENTIEL',
      name: 'Essentiel',
      price: 4.99,
      priceId: process.env.STRIPE_PRICE_ESSENTIEL ?? '',
      profiles: 1,
      entities: 20,
      level: 'BRONZE',
      highlighted: false,
      features: [
        { label: '1 profil certifié', included: true },
        { label: "Jusqu'à 20 entités", included: true },
        { label: 'Badge QR (SVG + PNG)', included: true },
        { label: 'Page de vérification publique', included: true },
        { label: 'Certification BRONZE', included: true },
        { label: 'Support email', included: true },
        { label: 'Statistiques de vérification', included: false },
        { label: 'Alertes fraude email', included: false },
        { label: 'Multi-profils', included: false },
      ],
    },
    {
      id: 'PREMIUM',
      name: 'Premium',
      price: 9.99,
      priceId: process.env.STRIPE_PRICE_PREMIUM ?? '',
      profiles: 1,
      entities: 100,
      level: 'SILVER',
      highlighted: true,
      features: [
        { label: '1 profil certifié', included: true },
        { label: "Jusqu'à 100 entités", included: true },
        { label: 'Badge QR (SVG + PNG)', included: true },
        { label: 'Page de vérification publique', included: true },
        { label: 'Certification SILVER', included: true },
        { label: 'Statistiques vérifications (7j/30j)', included: true },
        { label: 'Alertes fraude email', included: true },
        { label: 'Support prioritaire', included: true },
        { label: 'Multi-profils', included: false },
      ],
    },
    {
      id: 'FAMILLE',
      name: 'Famille',
      price: 14.99,
      priceId: process.env.STRIPE_PRICE_FAMILLE ?? '',
      profiles: 5,
      entities: 100,
      level: 'SILVER',
      highlighted: false,
      features: [
        { label: '5 profils indépendants', included: true },
        { label: "Jusqu'à 100 entités partagées", included: true },
        { label: 'Badge QR (SVG + PNG)', included: true },
        { label: 'Page de vérification publique', included: true },
        { label: 'Certification SILVER', included: true },
        { label: 'Statistiques vérifications', included: true },
        { label: 'Alertes fraude email', included: true },
        { label: 'Support prioritaire', included: true },
      ],
    },
    {
      id: 'FAMILLE_PLUS',
      name: 'Famille+',
      price: 24.99,
      priceId: process.env.STRIPE_PRICE_FAMILLE_PLUS ?? '',
      profiles: 10,
      entities: 300,
      level: 'GOLD',
      highlighted: false,
      features: [
        { label: '10 profils indépendants', included: true },
        { label: "Jusqu'à 300 entités partagées", included: true },
        { label: 'Badge QR (SVG + PNG)', included: true },
        { label: 'Page de vérification publique', included: true },
        { label: 'Certification GOLD', included: true },
        { label: 'Statistiques avancées', included: true },
        { label: 'Alertes fraude email', included: true },
        { label: 'Support prioritaire 24h', included: true },
        { label: 'Accès API en lecture', included: true },
      ],
    },
  ]
}

export type PlanId = PlanDefinition['id']

const VALID_PLAN_IDS: PlanId[] = ['ESSENTIEL', 'PREMIUM', 'FAMILLE', 'FAMILLE_PLUS']

export function isValidPlanId(id: string): id is PlanId {
  return VALID_PLAN_IDS.includes(id as PlanId)
}

export function getPriceIds(): Record<PlanId, string> {
  return {
    ESSENTIEL: process.env.STRIPE_PRICE_ESSENTIEL ?? '',
    PREMIUM: process.env.STRIPE_PRICE_PREMIUM ?? '',
    FAMILLE: process.env.STRIPE_PRICE_FAMILLE ?? '',
    FAMILLE_PLUS: process.env.STRIPE_PRICE_FAMILLE_PLUS ?? '',
  }
}
