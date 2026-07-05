import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/app/lib/db";
import { redactEmailRecipient, sendEmail } from "@/lib/email";
import { checkForgotPasswordRateLimit } from "@/lib/rate-limit-cost";
import { writeSecurityAuditLogFireAndForget } from "@/lib/security-audit";
import crypto from "crypto";

const bodySchema = z.object({ email: z.string().email() });

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: true });
    }
    const { email } = parsed.data;

    // Anti-spam d'emails : limite par IP ET par email. On répond toujours
    // { success: true } (anti-énumération) mais on n'envoie pas d'email si limité.
    const ip = clientIp(req);
    const [ipRate, emailRate] = await Promise.all([
      checkForgotPasswordRateLimit(`ip:${ip}`),
      checkForgotPasswordRateLimit(`email:${email.toLowerCase()}`),
    ]);
    if (!ipRate.ok || !emailRate.ok) {
      return NextResponse.json({ success: true });
    }

    void (async () => {
      const emailNorm = email.trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: emailNorm },
      });
      if (!user) return;

      writeSecurityAuditLogFireAndForget({
        action: "PASSWORD_RESET_REQUESTED",
        userId: user.id,
        resource: "user",
        resourceId: user.id,
        ip,
      });

      // Le token en clair n'est transmis QUE par email. En DB on ne stocke que son
      // hash SHA-256 (hash at rest) : si la base fuite, les tokens ne sont pas utilisables.
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 3600_000);

      await prisma.passwordReset.deleteMany({
        where: { email: emailNorm, used: false },
      });
      await prisma.passwordReset.create({
        data: { email: emailNorm, tokenHash, expiresAt, used: false },
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        "https://blocktrust.tech";
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      const ReactImport = await import("react");
      const { PasswordResetEmail, subject } = await import("@/emails/PasswordResetEmail");

      const { error } = await sendEmail({
        to: emailNorm,
        subject,
        react: ReactImport.createElement(PasswordResetEmail, {
          resetUrl,
          userName: user.name ?? undefined,
        }),
      });

      if (error) {
        console.error(
          "[FORGOT-PASSWORD] Échec envoi email:",
          redactEmailRecipient(emailNorm),
          error
        );
      }
    })().catch((err) => console.error("[FORGOT-PASSWORD]", err));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
