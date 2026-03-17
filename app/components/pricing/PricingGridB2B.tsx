'use client'

import PlanCard from './PlanCard'

type B2BPlan = {
  id: string
  name: string
  price: number | 'Sur devis'
  priceUnit?: string
  users: string
  badgeMultiSupport: string
  badgePoste?: string
  description: string
  features: string[]
  cta: string
  ctaStyle: { background: string; border?: string; color: string }
  isPopular: boolean
  icon: 'person' | 'shield' | 'group' | 'crown'
  mailto?: string
}

const B2B_PLANS: B2BPlan[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 29,
    priceUnit: '/mois',
    users: '1-3 utilisateurs',
    badgeMultiSupport: 'Multi-support inclus',
    badgePoste: 'Poste sup. +12€/mois',
    description: 'Idéal pour les TPE et indépendants',
    features: [
      '1 à 3 utilisateurs',
      'Badge multi-support (PC · Mobile · Tablette)',
      'Accès badge sur tous vos appareils',
      'QR code unique par poste',
      'Trust Circle entreprise',
      'Alertes fraude basiques',
      'Support email',
    ],
    cta: 'Choisir Starter',
    ctaStyle: { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' },
    isPopular: false,
    icon: 'person',
    mailto: 'mailto:commercial@blocktrust.tech?subject=Demande%20Starter',
  },
  {
    id: 'TEAM',
    name: 'Team',
    price: 79,
    priceUnit: '/mois',
    users: '4-10 utilisateurs',
    badgeMultiSupport: 'Multi-support inclus',
    badgePoste: 'Poste sup. +9€/mois',
    description: 'Pour les équipes en croissance',
    features: [
      '4 à 10 utilisateurs',
      'Badge multi-support (PC · Mobile · Tablette)',
      'Accès badge sur tous vos appareils',
      'QR code unique par poste',
      'Trust Circle entreprise étendu',
      'Alertes fraude avancées',
      'Détection phishing',
      'Tableau de bord équipe',
      'Support prioritaire',
    ],
    cta: 'Choisir Team',
    ctaStyle: { background: 'transparent', border: '1px solid #00d4ff', color: '#00d4ff' },
    isPopular: true,
    icon: 'shield',
    mailto: 'mailto:commercial@blocktrust.tech?subject=Demande%20Team',
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 199,
    priceUnit: '/mois',
    users: '11-50 utilisateurs',
    badgeMultiSupport: 'Multi-support inclus',
    badgePoste: 'Poste sup. +6€/mois',
    description: 'Solution entreprise complète',
    features: [
      '11 à 50 utilisateurs',
      'Badge multi-support (PC · Mobile · Tablette)',
      'Accès badge sur tous vos appareils',
      'Multi-sites & multi-départements',
      'Trust Circle illimité',
      'Détection usurpation avancée',
      'API entreprise',
      'Tableau de bord analytique',
      'Support dédié',
    ],
    cta: 'Choisir Business',
    ctaStyle: { background: 'var(--bt-gold)', color: '#0a1628' },
    isPopular: false,
    icon: 'group',
    mailto: 'mailto:commercial@blocktrust.tech?subject=Demande%20Business',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 'Sur devis',
    users: '51+ utilisateurs',
    badgeMultiSupport: 'Multi-support illimité',
    description: 'Pour les grandes organisations',
    features: [
      'Utilisateurs illimités',
      'Badge multi-support (PC · Mobile · Tablette)',
      'Accès badge sur tous vos appareils',
      'Déploiement sur site possible',
      'SSO / SAML intégration',
      'SLA garanti 99,9%',
      'Account manager dédié',
      'Audit sécurité inclus',
      'Conformité ISO 27001',
    ],
    cta: 'Contacter le service commercial',
    ctaStyle: { background: 'transparent', border: '1px solid var(--bt-gold)', color: 'var(--bt-gold)' },
    isPopular: false,
    icon: 'crown',
    mailto: 'mailto:commercial@blocktrust.tech',
  },
]

export default function PricingGridB2B() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1200px] mx-auto px-6">
      {B2B_PLANS.map((plan) => (
        <PlanCard
          key={plan.id}
          mode="B2B"
          name={plan.name}
          description={plan.description}
          price={plan.price}
          priceUnit={plan.priceUnit}
          subtitle={plan.users}
          badges={[
            { label: plan.badgeMultiSupport, style: 'multiSupport' },
            ...(plan.badgePoste ? [{ label: plan.badgePoste, style: 'muted' as const }] : []),
          ]}
          features={plan.features}
          cta={plan.cta}
          ctaStyle={plan.ctaStyle}
          isPopular={plan.isPopular}
          icon={plan.icon}
          ctaHref={plan.mailto}
        />
      ))}
    </div>
  )
}
