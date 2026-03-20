import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import crypto from "crypto";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: true });
    }
    const { email } = parsed.data;

    void (async () => {
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (!user || !user.password) return;

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 3600_000);

      await prisma.passwordReset.deleteMany({
        where: { email, used: false },
      });
      await prisma.passwordReset.create({
        data: { email, token, expiresAt, used: false },
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        "https://blocktrust.tech";
      const link = `${baseUrl}/auth/reset-password?token=${token}`;

      if (process.env.RESEND_API_KEY) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "BlockTrust <noreply@blocktrust.tech>",
          to: email,
          subject: "Réinitialisation de votre mot de passe",
          html: `Cliquez pour réinitialiser votre mot de passe : <a href="${link}">${link}</a>. Ce lien expire dans 1 heure.`,
        });
      } else {
        console.error(
          "[FORGOT-PASSWORD] RESEND_API_KEY absent : aucun email envoyé (ne jamais logger le lien reset)"
        );
      }
    })().catch((err) => console.error("[FORGOT-PASSWORD]", err));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
