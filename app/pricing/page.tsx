'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'
import PublicHeader from '@/app/components/PublicHeader'
import type { PlanDefinition } from '@/lib/pricing'

// Charte BlockTrust
const styles = {
  bg: '#001a33',
  primary: '#BDA76B',
  text: '#e8eaf0',
  textMuted: 'rgba(232,234,240,0.5)',
  border: 'rgba(189,167,107,0.2)',
  borderAccent: 'rgba(189,167,107,0.45)',
  success: '#1DB87E',
  danger: '#E05252',
  cardBg: 'rgba(0,34,68,0.85)',
  popularBadgeBg: 'rgba(189,167,107,0.15)',
}

const FAQ = [
  {
    q: 'Puis-je annuler à tout moment ?',
    a: "Oui, sans engagement et sans frais. L'annulation prend effet à la fin de la période en cours. Gérez votre abonnement directement depuis votre espace client.",
  },
  {
    q: "Qu'est-ce qu'une entité certifiée ?",
    a: "Une entité est une personne physique, une entreprise, un domaine web ou tout profil que vous souhaitez certifier avec un badge BlockTrust vérifiable.",
  },
  {
    q: 'Comment fonctionne le badge de vérification ?',
    a: "Chaque badge contient une signature cryptographique ES256 et un hash SHA-256 du contenu. Toute tentative de copie dans un contexte frauduleux est détectée et affiche une alerte fraude.",
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: "Oui. Vos données sont chiffrées, hébergées en Europe (Vercel EU), et nous sommes conformes au RGPD. Aucune donnée n'est vendue à des tiers.",
  },
  {
    q: 'Proposez-vous des offres pour les entreprises ?',
    a: 'Oui, notre offre B2B démarre à 29€/mois. Contactez-nous à contact@blocktrust.tech pour un devis personnalisé.',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [plans, setPlans] = useState<PlanDefinition[]>([])
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/pricing')
      .then((res) => res.json())
      .then((data) => setPlans(data.plans || []))
      .catch(() => setPlans([]))
  }, [])

  async function handleCheckout(priceId: string) {
    setLoadingPlan(priceId)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) router.push(data.url)
      else throw new Error(data.error || 'Erreur')
    } catch (err) {
      console.error('Checkout error:', err)
      setLoadingPlan(null)
    } finally {
      setLoadingPlan(null)
    }
  }

  const currentPlan = (session?.user as { plan?: string } | null)?.plan ?? null

  return (
    <div className="min-h-screen" style={{ backgroundColor: styles.bg }}>
      <PublicHeader />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <h1
          className="text-4xl md:text-5xl font-bold text-center mb-4"
          style={{ color: styles.text, fontFamily: 'var(--font-syne), sans-serif' }}
        >
          Protégez votre identité numérique
        </h1>
        <p
          className="text-center text-lg max-w-2xl mx-auto"
          style={{ color: styles.textMuted }}
        >
          Certification cryptographique · Badge vérifiable · Anti-fraude
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {plans.map((plan) => {
            const isCurrentPlan =
              currentPlan === plan.id &&
              status === 'authenticated' &&
              ['ESSENTIEL', 'PREMIUM', 'FAMILLE', 'FAMILLE_PLUS'].includes(currentPlan)
            const isLoggedIn = status === 'authenticated'

            let ctaLabel = 'Commencer — 4,99€/mois'
            let ctaDisabled = false
            let ctaOnClick: () => void = () =>
              signIn('google', { callbackUrl: '/pricing' })

            if (isLoggedIn && isCurrentPlan) {
              ctaLabel = 'Plan actuel'
              ctaDisabled = true
              ctaOnClick = () => {}
            } else if (isLoggedIn && !isCurrentPlan && plan.priceId) {
              ctaLabel = loadingPlan === plan.priceId ? '' : 'Choisir ce plan'
              ctaOnClick = () => handleCheckout(plan.priceId)
            } else if (!isLoggedIn) {
              ctaOnClick = () => signIn('google', { callbackUrl: '/pricing' })
            }

            return (
              <div
                key={plan.id}
                className="relative rounded-xl p-6 flex flex-col"
                style={{
                  backgroundColor: styles.cardBg,
                  border: plan.highlighted
                    ? `2px solid ${styles.borderAccent}`
                    : `1px solid ${styles.border}`,
                }}
              >
                {plan.highlighted && (
                  <div
                    className="absolute top-0 right-0 rounded-bl-lg px-2 py-1 text-[10px] font-semibold tracking-widest"
                    style={{
                      backgroundColor: styles.popularBadgeBg,
                      color: styles.primary,
                      fontFamily: 'var(--font-ibm-plex-mono), monospace',
                    }}
                  >
                    POPULAIRE
                  </div>
                )}
                <h3
                  className="text-lg font-bold uppercase mb-2"
                  style={{ color: styles.text, fontFamily: 'var(--font-syne), sans-serif' }}
                >
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: styles.text, fontFamily: 'var(--font-ibm-plex-mono), monospace' }}
                  >
                    {plan.price.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                  <span className="text-sm ml-1" style={{ color: styles.textMuted }}>
                    /mois
                  </span>
                </div>
                <div
                  className="h-px w-full mb-4"
                  style={{ backgroundColor: styles.border }}
                />
                <ul className="flex-1 space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm"
                      style={{
                        color: f.included ? styles.success : styles.textMuted,
                        textDecoration: f.included ? undefined : 'line-through',
                      }}
                    >
                      {f.included ? '✅' : '❌'} {f.label}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={ctaOnClick}
                  disabled={ctaDisabled || loadingPlan === plan.priceId}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-center transition disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: ctaDisabled
                      ? styles.textMuted
                      : styles.primary,
                    color: ctaDisabled ? styles.text : '#001a33',
                  }}
                >
                  {loadingPlan === plan.priceId ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Redirection...
                    </>
                  ) : (
                    ctaLabel
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h2
          className="text-2xl font-bold text-center mb-8"
          style={{ color: styles.text, fontFamily: 'var(--font-syne), sans-serif' }}
        >
          Questions fréquentes
        </h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: styles.cardBg,
                border: `1px solid ${styles.border}`,
              }}
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-6 py-4 flex justify-between items-center"
                style={{ color: styles.text }}
              >
                <span className="font-medium">{item.q}</span>
                <span style={{ color: styles.primary }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div
                  className="px-6 pb-4 pt-0"
                  style={{ color: styles.textMuted }}
                >
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* B2B */}
      <section
        className="max-w-7xl mx-auto mx-4 sm:mx-6 lg:mx-8 mb-16 rounded-xl py-6 px-6 text-center"
        style={{
          backgroundColor: styles.cardBg,
          border: `1px solid ${styles.border}`,
        }}
      >
        <p className="mb-4" style={{ color: styles.text }}>
          Vous êtes une entreprise ? Découvrez nos offres B2B à partir de 29€/mois
        </p>
        <a
          href="mailto:contact@blocktrust.tech"
          className="inline-block py-2 px-5 rounded-lg font-medium"
          style={{ backgroundColor: styles.primary, color: '#001a33' }}
        >
          Nous contacter
        </a>
      </section>
    </div>
  )
}
