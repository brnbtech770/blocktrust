import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createAdminAlert } from "@/lib/admin-alerts";
import { checkRateLimitRegisterAsync } from "@/lib/rate-limit-register";
import {
  isDisposableEmailDomain,
  matchesBotEmailPattern,
} from "@/lib/register-anti-bot";
import {
  REGISTRATION_NAME_ERROR,
  validateRegistrationNames,
} from "@/lib/registration-validation";
import { findUserByNormalizedEmail, normalizeEmail } from "@/lib/email-utils";
import { hashIp } from "@/app/lib/auth";
import {
  resolveWelcomeFirstName,
  sendWelcomeEmailIfNeeded,
} from "@/lib/welcome-email";
import { validatePassword } from "@/lib/password-policy";
import { verifyTurnstileForRegister } from "@/lib/turnstile";
import { clearLoginLockout } from "@/lib/login-lockout";
import { sendVerificationEmailForUser } from "@/lib/email-verification";
import { LEGAL_DOC_VERSION } from "@/lib/legal";

const MIN_FORM_MS = 3000;

const registerSchema = z
  .object({
    firstName: z.string().min(1).max(35),
    lastName: z.string().min(1).max(35),
    email: z.string().email().max(254),
    password: z.string().min(8).max(128),
    turnstileToken: z.string().min(1).optional(),
    /** Widget indisponible côté client — bypass fail-safe */
    turnstileBypass: z.boolean().optional(),
    /** Honeypot : doit rester vide */
    website: z.string().max(500).optional(),
    /** Date.now() côté client au montage du formulaire */
    formLoadedAt: z.number().int().optional(),
    acceptCgu: z
      .boolean()
      .refine((v) => v === true, {
        message:
          "Vous devez accepter les conditions générales et la politique de confidentialité.",
      }),
  })
  .refine(
    (d) => d.firstName.trim().length + d.lastName.trim().length + 1 <= 60,
    { message: "Prénom et nom trop longs ensemble (max 60 caractères au total)." },
  );

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function generic400() {
  return NextResponse.json(
    { error: "Une erreur est survenue. Vérifiez vos informations." },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      const err = parsed.error as { issues?: Array<{ message?: string }> };
      const message = err.issues?.[0]?.message ?? "Données invalides";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { firstName, lastName, email, password, website, formLoadedAt, turnstileToken, turnstileBypass } =
      parsed.data;
    const ip = clientIp(req);
    const hashedIP = hashIp(ip);

    const turnstile = await verifyTurnstileForRegister({
      token: turnstileToken,
      bypass: turnstileBypass === true,
      ip,
    });
    if (!turnstile.ok) {
      const message =
        turnstile.reason === "ip_blocked"
          ? "Trop de tentatives. Réessayez plus tard."
          : turnstile.reason === "invalid_token"
            ? "Vérification de sécurité échouée."
            : "Vérification de sécurité requise.";
      return NextResponse.json({ error: message }, { status: 403 });
    }

    if (website != null && String(website).trim() !== "") {
      return generic400();
    }

    if (
      typeof formLoadedAt !== "number" ||
      Number.isNaN(formLoadedAt) ||
      Date.now() - formLoadedAt < MIN_FORM_MS
    ) {
      return generic400();
    }

    const rl = await checkRateLimitRegisterAsync(ip);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de tentatives d'inscription. Réessayez plus tard." },
        { status: 429 },
      );
    }

    const emailNorm = normalizeEmail(email);

    const passwordCheck = validatePassword(password, emailNorm);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.errors[0] }, { status: 400 });
    }

    if (isDisposableEmailDomain(emailNorm)) {
      await createAdminAlert({
        type: "SUSPICIOUS_REGISTRATION",
        title: "🤖 Tentative d'inscription suspecte bloquée",
        description: `Email : ${emailNorm} — IP : ${hashedIP}`,
        metadata: { email: emailNorm, reason: "disposable_domain" },
      });
      return generic400();
    }

    if (matchesBotEmailPattern(emailNorm)) {
      await createAdminAlert({
        type: "SUSPICIOUS_REGISTRATION",
        title: "🤖 Tentative d'inscription suspecte bloquée",
        description: `Email : ${emailNorm} — IP : ${hashedIP}`,
        metadata: { email: emailNorm, reason: "bot_pattern" },
      });
      return generic400();
    }

    const nameCheck = validateRegistrationNames(firstName, lastName);
    if (!nameCheck.ok) {
      return NextResponse.json({ error: REGISTRATION_NAME_ERROR }, { status: 400 });
    }

    await new Promise((r) => setTimeout(r, Math.random() * 400 + 100));

    const existing = await findUserByNormalizedEmail(emailNorm);

    if (existing) {
      return generic400();
    }

    const conflictingEntity = await prisma.entity.findFirst({
      where: { email: { equals: emailNorm, mode: "insensitive" } },
      select: { id: true, userId: true },
    });
    if (conflictingEntity?.userId) {
      console.log(
        `[register] entity email collision entityId=${conflictingEntity.id.slice(0, 8)}… ownerUserId=${conflictingEntity.userId.slice(0, 8)}…`,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          name: `${firstName} ${lastName}`.trim(),
          email: emailNorm,
          password: hashedPassword,
          sessionVersion: 0,
          cguAcceptedAt: new Date(),
          cguVersion: LEGAL_DOC_VERSION,
        },
      });
    } catch (createErr: unknown) {
      const code =
        createErr &&
        typeof createErr === "object" &&
        "code" in createErr &&
        (createErr as { code?: string }).code;
      if (code === "P2002") {
        return generic400();
      }
      throw createErr;
    }

    console.log(`[register] User created: ${user.id}`);

    // Inscription réussie : effacer un éventuel lockout (tentatives login avant création du compte).
    await clearLoginLockout(emailNorm);

    await createAdminAlert({
      type: "NEW_USER",
      title: "Nouvel utilisateur inscrit",
      description: `${emailNorm} vient de créer un compte`,
      userId: user.id,
      metadata: { suspicious: false },
    });

    void sendWelcomeEmailIfNeeded(
      user.id,
      user.email ?? emailNorm,
      resolveWelcomeFirstName(user.name, emailNorm),
    );

    void sendVerificationEmailForUser(user.id).catch((err) =>
      console.error("[register] verification email failed", err),
    );

    return NextResponse.json(
      { success: true, userId: user.id, verificationSent: true },
      { status: 201 },
    );
  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez." },
      { status: 500 },
    );
  }
}
