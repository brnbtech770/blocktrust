import PricingPageClient from '@/app/components/pricing/PricingPageClient'
import { PLANS_B2B, PLANS_B2C } from '@/lib/pricing'

/** Tarifs publics — ISR 1h. Session lue côté client (auth() forcerait le dynamic). */
export const revalidate = 3600

export default function PricingPage() {
  return (
    <PricingPageClient
      plans={[...PLANS_B2C]}
      plansB2B={[...PLANS_B2B]}
    />
  )
}
