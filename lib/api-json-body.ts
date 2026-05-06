import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/** Lit un corps JSON optionnel ; valeur `{}` si corps absent ou vide. */
export async function readJsonBodyUnknown(
  req: NextRequest,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const raw = await req.text();
  if (!raw.trim()) {
    return { ok: true, value: {} };
  }
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

/** POST sans payload : rejette tout champ inattendu. */
export const strictEmptyBodySchema = z.object({}).strict();

export function jsonInvalidBody() {
  return NextResponse.json({ error: "Données invalides" }, { status: 400 });
}

/** Pour routes POST sans données métier (cron, whitelabel, etc.). */
export async function ensureStrictEmptyBody(
  req: NextRequest,
): Promise<NextResponse | null> {
  const r = await readJsonBodyUnknown(req);
  if (!r.ok) return jsonInvalidBody();
  const parsed = strictEmptyBodySchema.safeParse(r.value);
  if (!parsed.success) return jsonInvalidBody();
  return null;
}
