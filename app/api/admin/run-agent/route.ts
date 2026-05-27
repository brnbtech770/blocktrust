// app/api/admin/run-agent/route.ts
// Exécution manuelle d'un agent de surveillance (admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/lib/admin-utils'
import { runFraudSurveillance } from '@/lib/agents/fraud-surveillance'
import { runSecurityMonitor } from '@/lib/agents/security-monitor'
import { runSubscriptionMonitor } from '@/lib/agents/subscription-monitor'
import { runOnboardingMonitor } from '@/lib/agents/onboarding-monitor'
import { ensureStrictEmptyBody } from '@/lib/api-json-body'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const AGENTS = {
  fraud: runFraudSurveillance,
  security: runSecurityMonitor,
  subscription: runSubscriptionMonitor,
  onboarding: runOnboardingMonitor,
} as const

type AgentKey = keyof typeof AGENTS

const VALID_AGENTS = new Set<string>(Object.keys(AGENTS))

export async function POST(req: NextRequest) {
  const invalid = await ensureStrictEmptyBody(req)
  if (invalid) return invalid

  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const agent = req.nextUrl.searchParams.get('agent')
  if (!agent || !VALID_AGENTS.has(agent)) {
    return NextResponse.json(
      { error: 'Agent invalide — fraud | security | subscription | onboarding' },
      { status: 400 },
    )
  }

  try {
    const result = await AGENTS[agent as AgentKey]()
    return NextResponse.json({
      success: true,
      agent,
      runAt: new Date().toISOString(),
      result,
    })
  } catch {
    return NextResponse.json({ error: "Erreur lors de l'exécution de l'agent" }, { status: 500 })
  }
}
