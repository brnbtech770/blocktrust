// app/api/pricing/route.ts
// GET — Retourne les plans B2C avec Price IDs (côté serveur)
// ============================================================

import { NextResponse } from 'next/server'
import { getPlansServer } from '@/lib/pricing'

export async function GET() {
  const plans = getPlansServer()
  return NextResponse.json({ plans })
}
