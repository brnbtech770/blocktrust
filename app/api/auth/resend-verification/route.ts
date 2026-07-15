import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/lib/auth-server";
import { resendVerificationByEmail } from "@/lib/email-verification";

const bodySchema = z.object({
  email: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const parsed = bodySchema.safeParse(await req.json());
    const bodyEmail = parsed.success ? parsed.data.email?.trim().toLowerCase() : undefined;
    // Session connectée : forcer l'email de la session (évite le spam vers des tiers)
    const email = session?.user?.email?.trim().toLowerCase() ?? bodyEmail;

    if (!email) {
      return NextResponse.json(
        { error: "Indiquez une adresse email." },
        { status: 400 },
      );
    }

    const result = await resendVerificationByEmail(email);
    const status = !result.ok
      ? result.message.includes("Trop de demandes")
        ? 429
        : 503
      : 200;
    return NextResponse.json(
      { ok: result.ok, message: result.message },
      { status },
    );
  } catch (err) {
    console.error("[resend-verification]", err);
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez." },
      { status: 500 },
    );
  }
}
