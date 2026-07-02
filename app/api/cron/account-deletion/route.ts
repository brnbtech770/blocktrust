// app/api/cron/account-deletion/route.ts
// Cron — exécution suppressions compte après délai de grâce
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { secureCompareBearer } from "@/lib/api-key";
import { processDueAccountDeletions } from "@/lib/account-deletion";
import { captureCronFailure } from "@/lib/cron-sentry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  }

  if (!secureCompareBearer(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processDueAccountDeletions();
    return NextResponse.json({ success: true, processed });
  } catch (e) {
    captureCronFailure("account-deletion", e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
