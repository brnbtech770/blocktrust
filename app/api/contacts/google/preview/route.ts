// GET /api/contacts/google/preview — liste one-shot (sans tokens OAuth).
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { loadGoogleContactsPreview } from "@/lib/contacts-google-preview-store";
import { lookupCertifiedEmails } from "@/lib/lookup-certified-emails";
import { normalizeEmail } from "@/lib/email-normalize";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const preview = await loadGoogleContactsPreview(session.user.id);
  if (!preview) {
    return NextResponse.json({ contacts: [], expired: true });
  }

  const certified = await lookupCertifiedEmails(preview.map((row) => row.email));
  const contacts = preview.map((row) => ({
    ...row,
    certified: certified.has(normalizeEmail(row.email)),
  }));

  return NextResponse.json({ contacts, expired: false });
}
