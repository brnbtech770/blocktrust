// POST /api/contacts/import-google — persist Entity purpose=contact (sans Trust Circle / badge).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { assertSameOriginMutation } from "@/lib/csrf-origin-guard";
import { assertDashboardMutationAllowed } from "@/lib/require-email-verified";
import { checkPlanRateLimit } from "@/lib/rate-limit-plan";
import { checkRateLimitGoogleContactsImportAsync } from "@/lib/rate-limit-sensitive";
import { resolveEffectivePlan } from "@/lib/plan-features";
import { persistImportedContacts } from "@/lib/contacts-import-persist";
import {
  clearGoogleContactsPreview,
  loadGoogleContactsPreview,
} from "@/lib/contacts-google-preview-store";
import { CONTACTS_IMPORT_MAX_ROWS } from "@/lib/contacts-import";
import { selectGoogleContactsByIds } from "@/lib/google-contacts";
import { lookupCertifiedEmails } from "@/lib/lookup-certified-emails";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    contactIds: z.array(z.string().min(1).max(200)).min(1).max(CONTACTS_IMPORT_MAX_ROWS),
  })
  .strict();

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

  let parsedBody: z.infer<typeof bodySchema>;
  try {
    parsedBody = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Sélection invalide" }, { status: 400 });
  }

  const preview = await loadGoogleContactsPreview(user.id);
  if (!preview || preview.length === 0) {
    return NextResponse.json(
      { error: "Session d'import Google expirée. Relancez l'autorisation." },
      { status: 410 },
    );
  }

  const selected = selectGoogleContactsByIds(preview, parsedBody.contactIds);
  if (selected.length === 0) {
    return NextResponse.json({ error: "Aucun contact sélectionné" }, { status: 400 });
  }

  const dayLimit = await checkRateLimitGoogleContactsImportAsync(session.user.id);
  if (!dayLimit.ok) {
    return NextResponse.json(
      { error: "Limite d'imports Google atteinte (5 par jour). Réessayez demain." },
      { status: 429 },
    );
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

  const persist = await persistImportedContacts({
    userId: user.id,
    userEmail: user.email,
    rows: selected,
  });

  const certified = await lookupCertifiedEmails(persist.importedEmails);
  await clearGoogleContactsPreview(user.id);

  return NextResponse.json({
    imported: persist.imported,
    duplicates: persist.duplicates,
    invalid: persist.invalid,
    skippedOwn: persist.skippedOwn,
    quotaSkipped: persist.quotaSkipped,
    certified: certified.size,
  });
}
