import { auth } from '@/app/lib/auth-server'
import PricingPageClient from '@/app/components/pricing/PricingPageClient'
import { PLANS_B2B, PLANS_B2C } from '@/lib/pricing'

/** Tarifs publics — données statiques depuis lib/pricing (pas de fetch client). */
export default async function PricingPage() {
  const session = await auth()
  const user = session?.user as { plan?: string } | undefined

  return (
    <PricingPageClient
      plans={[...PLANS_B2C]}
      plansB2B={[...PLANS_B2B]}
      currentPlan={user?.plan ?? null}
      isAuthenticated={Boolean(session?.user?.id)}
    />
  )
}
