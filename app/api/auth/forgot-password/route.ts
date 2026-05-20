import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { redactEmailRecipient, sendEmail } from "@/lib/email";
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
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      const ReactImport = await import("react");
      const { PasswordResetEmail, subject } = await import("@/emails/PasswordResetEmail");

      const { error } = await sendEmail({
        to: email,
        subject,
        react: ReactImport.createElement(PasswordResetEmail, {
          resetUrl,
          userName: user.name ?? undefined,
        }),
      });

      if (error) {
        console.error(
          "[FORGOT-PASSWORD] Échec envoi email:",
          redactEmailRecipient(email),
          error
        );
      }
    })().catch((err) => console.error("[FORGOT-PASSWORD]", err));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
