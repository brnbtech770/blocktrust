import { NextRequest, NextResponse } from "next/server";
import { secureCompareBearer } from "@/lib/api-key";
import { processEmailVerificationCron } from "@/lib/email-verification";
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
    const result = await processEmailVerificationCron();
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    captureCronFailure("email-verification", e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
