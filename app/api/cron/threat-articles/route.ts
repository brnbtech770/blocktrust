// Cron Vercel — GET + Bearer CRON_SECRET (quotidien). RSS + Anthropic → ThreatArticle
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { runThreatArticlesIngest } from "@/lib/threat-articles-ingest"
import { captureCronFailure } from "@/lib/cron-sentry"
import { secureCompareBearer } from "@/lib/api-key"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

function unauthorizedCron() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET non configuré" },
      { status: 503 },
    )
  }

  const authHeader = req.headers.get("authorization")
  if (!secureCompareBearer(authHeader, secret)) {
    return unauthorizedCron()
  }

  try {
    const result = await runThreatArticlesIngest()
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    captureCronFailure("threat-articles", e)
    return NextResponse.json({ error: "Threat articles ingest failed" }, { status: 500 })
  }
}
