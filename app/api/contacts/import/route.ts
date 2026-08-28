// POST /api/contacts/import — import CSV carnet (sans Trust Circle)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { assertSameOriginMutation } from "@/lib/csrf-origin-guard";
import { assertDashboardMutationAllowed } from "@/lib/require-email-verified";
import { checkEntityQuota } from "@/lib/checkQuota";
import { checkPlanRateLimit } from "@/lib/rate-limit-plan";
import { resolveEffectivePlan } from "@/lib/plan-features";
import { isUserOwnProfileEntity } from "@/lib/entity-contacts";
import { assertSafeDisplayText } from "@/lib/sanitize-display-text";
import { parseContactsCsv } from "@/lib/contacts-import";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const originGuard = assertSameOriginMutation(req);
  if (!originGuard.ok) {
    return NextResponse.json({ error: originGuard.message }, { status: originGuard.status });
  }

  const mutationGuard = await assertDashboardMutationAllowed(session.user.id, session.user.email);
  if (!mutationGuard.ok) {
    return NextResponse.json(
      { error: mutationGuard.code, message: mutationGuard.message },
      { status: mutationGuard.status },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true, plan: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  const effectivePlan = resolveEffectivePlan({
    subscription: user.subscription,
    email: user.email,
    planType: user.plan?.type,
  });
  const rl = await checkPlanRateLimit("contacts", effectivePlan, user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop d'imports. Réessayez dans un instant." },
      { status: 429 },
    );
  }

  let csvData = "";
  try {
    const body = (await req.json()) as { csvData?: unknown };
    csvData = typeof body.csvData === "string" ? body.csvData : "";
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const parsed = parseContactsCsv(csvData);
  if (parsed.rows.length === 0) {
    return NextResponse.json({
      imported: 0,
      duplicates: parsed.duplicates,
      invalid: parsed.invalid,
      skippedOwn: 0,
      quotaSkipped: 0,
    });
  }

  const existing = await prisma.entity.findMany({
    where: { userId: user.id },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((e) => e.email.trim().toLowerCase()));

  let duplicates = parsed.duplicates;
  let skippedOwn = 0;
  let invalid = parsed.invalid;

  const toCreate: Array<{
    userId: string;
    entityType: "INDIVIDUAL";
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    description: string | null;
  }> = [];

  for (const row of parsed.rows) {
    if (isUserOwnProfileEntity({ email: row.email }, user.email)) {
      skippedOwn += 1;
      continue;
    }
    if (existingEmails.has(row.email)) {
      duplicates += 1;
      continue;
    }

    const fn = assertSafeDisplayText(row.firstName, "Prénom");
    const ln = assertSafeDisplayText(row.lastName, "Nom");
    if (!fn.ok || !ln.ok) {
      invalid += 1;
      continue;
    }

    let description: string | null = null;
    if (row.company) {
      const companyCheck = assertSafeDisplayText(row.company, "Entreprise");
      description = companyCheck.ok ? companyCheck.value.slice(0, 1000) : null;
    }

    toCreate.push({
      userId: user.id,
      entityType: "INDIVIDUAL",
      firstName: fn.value,
      lastName: ln.value,
      email: row.email,
      phone: row.phone ? row.phone.slice(0, 40) : null,
      description,
    });
    existingEmails.add(row.email);
  }

  const quota = await checkEntityQuota(user.id);
  const remaining =
    quota.max == null
      ? toCreate.length
      : Math.max(0, quota.max - (quota.current ?? 0));
  const accepted = toCreate.slice(0, remaining);
  const quotaSkipped = toCreate.length - accepted.length;

  if (accepted.length > 0) {
    await prisma.entity.createMany({ data: accepted });
  }

  return NextResponse.json({
    imported: accepted.length,
    duplicates,
    invalid,
    skippedOwn,
    quotaSkipped,
  });
}
