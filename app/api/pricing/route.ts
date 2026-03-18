// app/api/pricing/route.ts
// GET — Plans B2C et B2B avec Price IDs mensuel/annuel (côté serveur)
// ============================================================

import { NextResponse } from 'next/server'
import { PLANS_B2C, PLANS_B2B } from '@/lib/pricing'

export async function GET() {
  return NextResponse.json({
    plans: PLANS_B2C,
    plansB2B: PLANS_B2B,
  })
}
