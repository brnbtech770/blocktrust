/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
import "./auth-env-shim";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/app/lib/db";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { z } from "zod";
import { headers } from "next/headers";
import authEdgeConfig from "./auth.edge.config";
import { isSafeCallbackUrl } from "./auth-callback-url";
import { isInternalAccount } from "@/lib/admin-utils";
import { DEFAULT_B2C_PLAN, resolveEffectivePlan } from "@/lib/plan-features";
import {
  recordLoginSuccess,
} from "@/lib/login-lockout";
import {
  checkCredentialsLogin,
  credentialsCheckToAuthErrorCode,
} from "@/lib/credentials-login-check";
import { cancelScheduledAccountDeletion } from "@/lib/account-deletion";
import { isPrismaUnreachableError } from "@/lib/prisma-unreachable";
import { evaluateSessionSecurity } from "@/lib/auth-session-security";

class LockoutCredentialsError extends CredentialsSignin {
  code = "account_locked";

  constructor(lockoutCode: string) {
    super();
    this.code = lockoutCode;
  }
}

class FailedAttemptsCredentialsError extends CredentialsSignin {
  code = "CredentialsSignin";

  constructor(failedCode: string) {
    super();
    this.code = failedCode;
  }
}

class NoPasswordError extends CredentialsSignin {
  code = "no_password";
}

class AccountSuspendedError extends CredentialsSignin {
  code = "account_suspended";
}

async function resolveUserAccountStatusByEmail(
  emailNorm: string,
): Promise<"ACTIVE" | "SUSPENDED" | null> {
  const user = await prisma.user.findUnique({
    where: { email: emailNorm },
    select: { accountStatus: true },
  });
  return user?.accountStatus ?? null;
}

async function touchLastLogin(userId: string): Promise<void> {
  await prisma.user
    .update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    })
    .catch((e) => console.error("[lastLoginAt]", e));
}

/**
 * Configuration NextAuth avec Google OAuth
 */
// Vérifier les variables d'environnement requises (avertissement seulement)
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.warn(
    '⚠️  AUTH_SECRET / NEXTAUTH_SECRET manquant — générez avec: openssl rand -base64 32'
  );
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn('⚠️  GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquant');
  console.warn('   L\'authentification Google ne fonctionnera pas');
}

/** Magic link (email) — envoi via Resend (lib/email), id provider = "email" pour signIn("email", …) */
const emailMagicLinkProvider = {
  id: "email",
  type: "email" as const,
  name: "Email",
  from: "BLOCKTRUST™ <noreply@blocktrust.tech>",
  maxAge: 24 * 60 * 60,
  async sendVerificationRequest({
    identifier,
    url,
  }: {
    identifier: string;
    url: string;
  }) {
    const { sendEmail } = await import("@/lib/email");
    const ReactImport = await import("react");
    const { MagicLinkEmail, subject } = await import("@/emails/MagicLinkEmail");
    await sendEmail({
      to: identifier,
      subject,
      react: ReactImport.createElement(MagicLinkEmail, { url }),
    });
  },
};

/**
 * Résout l'utilisateur Prisma après OAuth : id renvoyé par l'adapter, email, ou upsert (aligné sur signIn Google).
 * Évite un JWT sans `sub` si findUnique par email seul échoue (timing, casse, user.id déjà disponible).
 */
async function resolveDbUserAfterOAuth(user: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}) {
  if (user.id) {
    const byId = await prisma.user.findUnique({ where: { id: user.id } });
    if (byId) return byId;
  }
  const email = user.email?.trim();
  if (!email) return null;

  const emailNorm = email.toLowerCase();

  let dbUser = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (dbUser) return dbUser;

  dbUser = await prisma.user.findFirst({
    where: { email: { equals: emailNorm, mode: "insensitive" } },
  });
  if (dbUser) return dbUser;

  return prisma.user.upsert({
    where: { email: emailNorm },
    update: {
      name: user.name,
      image: user.image,
    },
    create: {
      email: emailNorm,
      name: user.name,
      image: user.image,
      kycStatus: "PENDING",
      accountType: "PERSONAL",
    },
  });
}

// allowDangerousEmailAccountLinking : uniquement sur GoogleProvider (pas d’option globale Auth.js v5)
export const authOptions: NextAuthConfig = {
  ...authEdgeConfig,
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authEdgeConfig.providers,
    emailMagicLinkProvider,
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const schema = z.object({
          email: z.string().email(),
          password: z.string().min(1),
        });
        const parsed = schema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const emailNorm = email.trim().toLowerCase();

        const hdrs = await headers();
        const clientIp =
          hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          hdrs.get("x-real-ip") ||
          null;

        const check = await checkCredentialsLogin({
          email: emailNorm,
          password,
          clientIp,
          precheck: false,
        });

        if (!check.ok) {
          const code = credentialsCheckToAuthErrorCode(check);
          if (check.error === "locked") {
            throw new LockoutCredentialsError(code);
          }
          if (check.error === "invalid") {
            throw new FailedAttemptsCredentialsError(code);
          }
          if (check.error === "account_suspended") {
            throw new AccountSuspendedError();
          }
          if (check.error === "no_password") {
            throw new NoPasswordError();
          }
          return null;
        }

        await recordLoginSuccess(emailNorm, { ip: clientIp, userId: check.user.id });

        const deletionRow = await prisma.user.findUnique({
          where: { id: check.user.id },
          select: { accountDeletionScheduledAt: true },
        });
        if (deletionRow?.accountDeletionScheduledAt) {
          await cancelScheduledAccountDeletion(check.user.id);
        }

        return check.user;
      },
    }),
  ],
  callbacks: {
    ...authEdgeConfig.callbacks,
    // Google OAuth : garantir un enregistrement User (avant JWT) — requis si l’adapter est en retard ou en échec partiel.
    async signIn({ user, account, profile: _profile }) {
      const email = user.email?.trim().toLowerCase();
      if (
        email &&
        (account?.provider === "google" || account?.provider === "email")
      ) {
        const status = await resolveUserAccountStatusByEmail(email);
        if (status === "SUSPENDED") {
          return "/auth/signin?error=account_suspended";
        }
      }

      if (account?.provider === 'google') {
        const googleEmail = user.email?.trim();
        if (!googleEmail) {
          console.warn('[signIn google] email absent du profil, connexion refusée');
          return false;
        }
        const emailNorm = googleEmail.toLowerCase();
        try {
          await prisma.user.upsert({
            where: { email: emailNorm },
            update: {
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
            },
            create: {
              email: emailNorm,
              name: user.name,
              image: user.image,
              kycStatus: 'PENDING',
              accountType: 'PERSONAL',
              emailVerified: new Date(),
            },
          });
        } catch (err) {
          console.error('[signIn callback error]', err);
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        const loginUserId =
          typeof user.id === "string" ? user.id : typeof token.sub === "string" ? token.sub : null;
        if (loginUserId) {
          void touchLastLogin(loginUserId);
          const dbSec = await prisma.user
            .findUnique({
              where: { id: loginUserId },
              select: { sessionVersion: true, accountDeletionScheduledAt: true },
            })
            .catch(() => null);
          if (dbSec) {
            token.sessionVersion = dbSec.sessionVersion;
            if (dbSec.accountDeletionScheduledAt) {
              await cancelScheduledAccountDeletion(loginUserId);
            }
          }
        }

        if (account?.provider === "credentials") {
          token.sub = user.id ?? token.sub;
          token.email = user.email ?? undefined;
          token.name = user.name ?? undefined;
          token.plan = user.plan ?? undefined;
          token.kycStatus = user.kycStatus ?? 'PENDING';
          token.accountType = user.accountType ?? 'PERSONAL';
          token.cookieConsent = user.cookieConsent ?? false;
          token.planFetchedAt = Date.now();
          if (typeof token.sessionVersion !== "number") {
            token.sessionVersion = 0;
          }
        } else {
          // Connexion Google/OAuth — user vient de l'adapter (id DB + email)
          // Fallback immédiat : toujours peupler le token avec les infos OAuth disponibles
          // pour éviter un JWT vide si la requête DB échoue.
          token.sub = user.id ?? token.sub;
          token.email = user.email ?? token.email;
          token.name = user.name ?? token.name;
          token.picture = user.image ?? token.picture;

          try {
            const dbUser = await resolveDbUserAfterOAuth(user);
            if (dbUser) {
              token.sub = dbUser.id;
              token.email = dbUser.email ?? undefined;
              token.name = dbUser.name ?? undefined;
              token.picture = dbUser.image ?? undefined;
              token.kycStatus = dbUser.kycStatus ?? "PENDING";
              token.accountType = dbUser.accountType ?? "PERSONAL";
              token.cookieConsent = dbUser.cookieConsent ?? false;

              const oauthEmail = dbUser.email ?? user.email;
              if (oauthEmail && !isInternalAccount(oauthEmail)) {
                const subscription = await prisma.subscription
                  .findUnique({
                    where: { userId: dbUser.id },
                    select: {
                      plan: true,
                      status: true,
                      stripeSubscriptionId: true,
                      currentPeriodEnd: true,
                    },
                  })
                  .catch(() => null);
                const planRow = dbUser.planId
                  ? await prisma.plan
                      .findUnique({ where: { id: dbUser.planId }, select: { type: true } })
                      .catch(() => null)
                  : null;
                token.plan = resolveEffectivePlan({
                  subscription,
                  email: oauthEmail,
                  planType: planRow?.type,
                });
                token.planFetchedAt = Date.now();
              }
            } else {
              const uid = typeof user.id === "string" ? `${user.id.slice(0, 8)}...` : "?";
              console.error(`[JWT OAuth] impossible de résoudre User en base userId=${uid}`);
            }
          } catch (error) {
            console.error("❌ Error in JWT callback (OAuth):", error);
            // Fallback déjà appliqué ci-dessus — la session sera fonctionnelle
            // même si la requête DB échoue (cold start, timeout, etc.)
          }
        }
      }
      if (token.sub && !user) {
        let svRow: {
          sessionVersion: number;
          email: string | null;
          accountStatus: string;
        } | null = null;
        let svUnreachable = false;
        try {
          svRow = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { sessionVersion: true, email: true, accountStatus: true },
          });
        } catch (err) {
          if (isPrismaUnreachableError(err)) {
            svUnreachable = true;
            console.warn("[jwt] sessionVersion skip — db unreachable");
          } else {
            throw err;
          }
        }

        const decision = evaluateSessionSecurity({
          dbUnreachable: svUnreachable,
          row: svRow,
          tokenSessionVersion:
            typeof token.sessionVersion === "number" ? token.sessionVersion : undefined,
        });
        if (decision.invalid) {
          token.sessionInvalid = true;
        } else if (typeof decision.adoptSessionVersion === "number") {
          token.sessionVersion = decision.adoptSessionVersion;
        }
      }

      if (trigger === "update" && session && typeof session === "object") {
        const patch = session as { sessionVersion?: number };
        if (typeof patch.sessionVersion === "number") {
          token.sessionVersion = patch.sessionVersion;
          token.sessionInvalid = false;
        }
      }

      // Rafraîchir plan + profil uniquement si cache expiré (> 1 h) — évite Prisma à chaque requête.
      if (token.sub && !user && !token.sessionInvalid) {
        const email = typeof token.email === "string" ? token.email : null;
        const isInternalUser = email ? isInternalAccount(email) : false;

        if (!isInternalUser) {
          const planStale =
            !token.planFetchedAt || Date.now() - token.planFetchedAt > 3_600_000;

          if (planStale) {
            const dbUser = await prisma.user
              .findUnique({
                where: { id: token.sub },
                select: {
                  email: true,
                  kycStatus: true,
                  accountType: true,
                  cookieConsent: true,
                  plan: { select: { type: true } },
                  subscription: {
                    select: {
                      plan: true,
                      status: true,
                      stripeSubscriptionId: true,
                      currentPeriodEnd: true,
                    },
                  },
                },
              })
              .catch(() => null);

            token.plan = resolveEffectivePlan({
              subscription: dbUser?.subscription,
              email: dbUser?.email ?? email,
              planType: dbUser?.plan?.type,
            });
            if (dbUser) {
              if (dbUser.email) {
                token.email = dbUser.email;
              }
              token.kycStatus = dbUser.kycStatus ?? "PENDING";
              token.accountType = dbUser.accountType ?? "PERSONAL";
              token.cookieConsent = dbUser.cookieConsent ?? false;
            }
            token.planFetchedAt = Date.now();
          }
        }
      }

      if (token.sub && typeof token.email === "string" && isInternalAccount(token.email as string)) {
        if (!token.adminBootstrapped) {
          token.adminBootstrapped = true;
          import("@/lib/admin-bootstrap").then(({ ensureAdminBootstrapForSession }) =>
            ensureAdminBootstrapForSession(
              token.sub as string,
              token.email as string,
              typeof token.name === "string" ? token.name : ""
            ).catch((e) => console.error("[Bootstrap] silenced:", e))
          );
        }
        token.plan = "B2B_ENTERPRISE";
        token.planType = "B2B_ENTERPRISE";
      }

      return token;
    },
    async session({ session, token }) {
      if (token.sessionInvalid) {
        return { ...session, expires: new Date(0).toISOString() };
      }
      if (session.user) {
        return {
          ...session,
          user: {
            ...session.user,
            id: (token.sub ?? token.id ?? '') as string,
            email: session.user.email ?? token.email ?? '',
            plan: (token.plan ?? DEFAULT_B2C_PLAN) as string,
            planType: token.planType as string | undefined,
            kycStatus: token.kycStatus ?? 'PENDING',
            accountType: token.accountType ?? 'PERSONAL',
            cookieConsent: token.cookieConsent ?? false,
          },
        };
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      const origin = new URL(baseUrl).origin;
      const fallback = `${origin}/dashboard`;
      try {
        const resolved = new URL(url, baseUrl).href;
        if (isSafeCallbackUrl(resolved, baseUrl)) {
          return resolved;
        }
      } catch {
        /* URL invalide */
      }
      return fallback;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const { sendWelcomeEmailIfNeeded, resolveWelcomeFirstName } = await import(
        "@/lib/welcome-email"
      );
      void sendWelcomeEmailIfNeeded(
        user.id,
        user.email,
        resolveWelcomeFirstName(user.name, user.email),
      );
    },
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};

/**
 * Helper pour vérifier l'authentification
 * Utilise NextAuth v5 auth() depuis auth-server
 */
export async function getAuthUser(_req: NextRequest) {
  try {
    // Pour NextAuth v5, on utilise auth() depuis auth-server
    // Import dynamique pour éviter les erreurs de circular dependency
    const { auth } = await import("./auth-server");
    const session = await auth();
    
    if (!session?.user?.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        entities: true,
        plan: true,
      },
    });

    return user;
  } catch (error) {
    console.error("❌ getAuthUser error:", error);
    // Pas de fallback header/cookie : contournement trivial d’auth autrement
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a accès à une fonctionnalité selon son plan
 */
export function checkPlanFeature(plan: string | { type?: string; trustCircleEnabled?: boolean; blockchainAnchor?: boolean } | null, feature: string): boolean {
  if (plan && typeof plan === 'object' && 'type' in plan) {
    const planObj = plan as { type?: string; trustCircleEnabled?: boolean; blockchainAnchor?: boolean };
    
    if (feature === 'trustCircle' && planObj.trustCircleEnabled) return true;
    if (feature === 'blockchainAnchor' && planObj.blockchainAnchor) return true;
    if (
      feature === 'unlimited' &&
      (planObj.type?.includes('PLUS') ||
        planObj.type?.includes('BUSINESS') ||
        planObj.type?.includes('ENTERPRISE'))
    ) {
      return true;
    }
    
    const planType = planObj.type || '';
    return checkPlanFeatureByType(planType, feature);
  }
  
  if (typeof plan === 'string') {
    return checkPlanFeatureByType(plan, feature);
  }
  
  return false;
}

function checkPlanFeatureByType(planType: string, feature: string): boolean {
  const planFeatures: Record<string, string[]> = {
    B2C_ESSENTIEL: ["basic"],
    ESSENTIEL: ["basic"],
    B2C_PREMIUM: ["basic", "advanced", "trustCircle"],
    PREMIUM: ["basic", "advanced", "trustCircle"],
    B2C_FAMILLE: ["basic", "advanced", "trustCircle"],
    FAMILLE: ["basic", "advanced", "trustCircle"],
    // legacy — rétro-compat uniquement, non souscriptible (webhook / abonnés existants)
    B2C_FAMILLE_PLUS: ["basic", "advanced", "trustCircle", "unlimited"],
    "FAMILLE_PLUS": ["basic", "advanced", "trustCircle", "unlimited"],
    B2B_SOLO_PRO: ["basic", "advanced", "trustCircle"],
    SOLO_PRO: ["basic", "advanced", "trustCircle"],
    B2B_STARTER: ["basic", "advanced", "trustCircle"],
    STARTER: ["basic", "advanced", "trustCircle"],
    B2B_TEAM: ["basic", "advanced", "trustCircle"],
    TEAM: ["basic", "advanced", "trustCircle"],
    B2B_BUSINESS: ["basic", "advanced", "trustCircle", "unlimited"],
    BUSINESS: ["basic", "advanced", "trustCircle", "unlimited"],
    B2B_ENTERPRISE: ["basic", "advanced", "trustCircle", "unlimited", "enterprise"],
    ENTERPRISE: ["basic", "advanced", "trustCircle", "unlimited", "enterprise"],
  };

  return planFeatures[planType]?.includes(feature) || false;
}

/**
 * Hash IP pour RGPD (SHA-256 avec salt)
 */
export function hashIp(ip: string): string {
  // Salt DÉDIÉ : on ne dérive plus de NEXTAUTH_SECRET (évite le couplage de secrets).
  const dedicated = process.env.IP_HASH_SALT?.trim();
  if (dedicated) {
    return createHash("sha256").update(ip + dedicated).digest("hex");
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[hashIp] IP_HASH_SALT manquant en production — configurez un salt dédié.",
    );
  }
  return createHash("sha256").update(ip + "dev-ip-salt-change-me").digest("hex");
}

/**
 * Trouve un Plan à partir d'un priceId Stripe
 */
export async function findPlanFromPriceId(priceId: string): Promise<string | null> {
  try {
    const existingPlan = await prisma.plan.findUnique({
      where: { stripePriceId: priceId },
    });

    if (existingPlan) {
      return existingPlan.id;
    }

    return null;
  } catch (error) {
    console.error('Error finding plan from priceId:', error);
    return null;
  }
}

/**
 * Mappe un priceId Stripe vers un PlanType
 */
export function mapPriceIdToPlanType(priceId: string): string | null {
  const planMap: Record<string, string> = {
    [process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY || '']: 'B2C_ESSENTIEL',
    [process.env.STRIPE_PRICE_ESSENTIEL_YEARLY || '']: 'B2C_ESSENTIEL',
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '']: 'B2C_PREMIUM',
    [process.env.STRIPE_PRICE_PREMIUM_YEARLY || '']: 'B2C_PREMIUM',
    [process.env.STRIPE_PRICE_FAMILLE_MONTHLY || '']: 'B2C_FAMILLE',
    [process.env.STRIPE_PRICE_FAMILLE_YEARLY || '']: 'B2C_FAMILLE',
    // legacy — rétro-compat uniquement, non souscriptible (voir lib/pricing.ts isLegacyPriceId)
    [process.env.STRIPE_PRICE_FAMILLE_PLUS_MONTHLY || '']: 'B2C_FAMILLE_PLUS',
    [process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY || '']: 'B2C_FAMILLE_PLUS',
    [process.env.STRIPE_PRICE_SOLO_PRO_MONTHLY || '']: 'B2B_SOLO_PRO',
    [process.env.STRIPE_PRICE_SOLO_PRO_YEARLY || '']: 'B2B_SOLO_PRO',
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || '']: 'B2B_STARTER',
    [process.env.STRIPE_PRICE_STARTER_YEARLY || '']: 'B2B_STARTER',
    [process.env.STRIPE_PRICE_TEAM_MONTHLY || '']: 'B2B_TEAM',
    [process.env.STRIPE_PRICE_TEAM_YEARLY || '']: 'B2B_TEAM',
    [process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '']: 'B2B_BUSINESS',
    [process.env.STRIPE_PRICE_BUSINESS_YEARLY || '']: 'B2B_BUSINESS',
  };

  return planMap[priceId] || null;
}
