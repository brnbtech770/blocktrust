import "./auth-env-shim";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/app/lib/db";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import authEdgeConfig from "./auth.edge.config";

/**
 * Configuration NextAuth avec Google OAuth
 * Version minimale pour déboguer
 */
// Vérifier les variables d'environnement requises (avertissement seulement)
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('⚠️  NEXTAUTH_SECRET est manquant dans les variables d\'environnement');
  console.warn('   Générez-le avec: openssl rand -base64 32');
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
  from: "BlockTrust <noreply@blocktrust.tech>",
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

  let dbUser = await prisma.user.findUnique({ where: { email } });
  if (dbUser) return dbUser;

  dbUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (dbUser) return dbUser;

  return prisma.user.upsert({
    where: { email },
    update: {
      name: user.name,
      image: user.image,
    },
    create: {
      email,
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
  /** Logs détaillés [auth] si AUTH_DEBUG=true sur Vercel (temporaire, diagnostic). */
  debug: process.env.AUTH_DEBUG === "true",
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

        const user = await prisma.user.findUnique({
          where: { email },
          include: { subscription: true },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        const plan = user.subscription?.plan ?? "ESSENTIEL";

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          plan,
          kycStatus: (user as any).kycStatus ?? 'PENDING',
          accountType: (user as any).accountType ?? 'PERSONAL',
        };
      },
    }),
  ],
  callbacks: {
    ...authEdgeConfig.callbacks,
    // Google OAuth : garantir un enregistrement User (avant JWT) — requis si l’adapter est en retard ou en échec partiel.
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email?.trim();
        if (!email) {
          console.warn('[signIn google] email absent du profil, connexion refusée');
          return false;
        }
        try {
          await prisma.user.upsert({
            where: { email },
            update: {
              name: user.name,
              image: user.image,
            },
            create: {
              email,
              name: user.name,
              image: user.image,
              kycStatus: 'PENDING',
              accountType: 'PERSONAL',
            },
          });
        } catch (err) {
          console.error('[signIn callback error]', err);
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "credentials") {
          token.sub = (user as any).id;
          token.email = user.email ?? undefined;
          token.name = user.name ?? undefined;
          (token as any).plan = (user as any).plan ?? null;
          (token as any).kycStatus = (user as any).kycStatus ?? 'PENDING';
          (token as any).accountType = (user as any).accountType ?? 'PERSONAL';
        } else {
          // Connexion Google/OAuth — user vient de l'adapter (id DB + email)
          // Fallback immédiat : toujours peupler le token avec les infos OAuth disponibles
          // pour éviter un JWT vide si la requête DB échoue.
          token.sub = (user as any).id ?? token.sub;
          token.email = user.email ?? token.email;
          token.name = user.name ?? token.name;
          token.picture = (user as any).image ?? token.picture;

          try {
            const dbUser = await resolveDbUserAfterOAuth(user as any);
            if (dbUser) {
              token.sub = dbUser.id;
              token.email = dbUser.email ?? undefined;
              token.name = dbUser.name ?? undefined;
              token.picture = dbUser.image ?? undefined;
              (token as any).kycStatus = (dbUser as any).kycStatus ?? "PENDING";
              (token as any).accountType = dbUser.accountType ?? "PERSONAL";
            } else {
              console.error("[JWT OAuth] impossible de résoudre User en base", {
                userId: (user as any).id,
                email: (user as any).email,
              });
            }
          } catch (error) {
            console.error("❌ Error in JWT callback (OAuth):", error);
            // Fallback déjà appliqué ci-dessus — la session sera fonctionnelle
            // même si la requête DB échoue (cold start, timeout, etc.)
          }
        }
      }
      // Rafraîchir plan + KYC uniquement quand ce n’est pas le premier JWT de cette connexion :
      // si `user` est défini, on vient déjà de peupler le token (OAuth + resolveDbUserAfterOAuth).
      // Éviter un second bloc Prisma ici réduit la charge au cold start Vercel (timeouts / session vide).
      if (token.sub && !user) {
        try {
          const [sub, dbUser] = await Promise.all([
            prisma.subscription.findUnique({
              where: { userId: token.sub },
              select: { plan: true },
            }),
            prisma.user.findUnique({
              where: { id: token.sub },
              select: { email: true, kycStatus: true, accountType: true },
            }),
          ]);
          (token as any).plan = sub?.plan ?? null;
          if (dbUser) {
            if (dbUser.email) {
              token.email = dbUser.email;
            }
            (token as any).kycStatus = dbUser.kycStatus ?? 'PENDING';
            (token as any).accountType = dbUser.accountType ?? 'PERSONAL';
          }
        } catch (err) {
          console.error('[JWT callback error]', err);
          (token as any).kycStatus = (token as any).kycStatus ?? 'PENDING';
          (token as any).accountType = (token as any).accountType ?? 'PERSONAL';
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        return {
          ...session,
          user: {
            ...session.user,
            id: (token.sub ?? (token as any).id ?? '') as string,
            email: session.user.email ?? token.email ?? '',
            plan: (token as any).plan ?? 'ESSENTIEL',
            kycStatus: (token as any).kycStatus ?? 'PENDING',
            accountType: (token as any).accountType ?? 'PERSONAL',
          },
        };
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      try {
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`;
        }
        const target = new URL(url);
        const origin = new URL(baseUrl).origin;
        if (target.origin === origin) {
          return url;
        }
      } catch {
        /* URL invalide */
      }
      return baseUrl;
    },
  },
  logger: {
    error(code, ...message) {
      console.error('[NEXTAUTH ERROR]', code, JSON.stringify(message));
    },
    warn(code) {
      console.warn('[NEXTAUTH WARN]', code);
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Helper pour vérifier l'authentification
 * Utilise NextAuth v5 auth() depuis auth-server
 */
export async function getAuthUser(req: NextRequest) {
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
    B2C_ESSENTIEL: ["basic", "trustCircle"],
    ESSENTIEL: ["basic", "trustCircle"],
    B2C_PREMIUM: ["basic", "advanced", "trustCircle"],
    PREMIUM: ["basic", "advanced", "trustCircle"],
    B2C_FAMILLE: ["basic", "advanced", "trustCircle"],
    FAMILLE: ["basic", "advanced", "trustCircle"],
    B2C_FAMILLE_PLUS: ["basic", "advanced", "trustCircle", "unlimited"],
    "FAMILLE_PLUS": ["basic", "advanced", "trustCircle", "unlimited"],
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
  const salt =
    process.env.IP_HASH_SALT ||
    (process.env.NODE_ENV === "production" && process.env.NEXTAUTH_SECRET
      ? `${process.env.NEXTAUTH_SECRET}:blocktrust-ip`
      : "dev-ip-salt-change-me");
  return createHash("sha256").update(ip + salt).digest("hex");
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
    [process.env.STRIPE_PRICE_FAMILLE_PLUS_MONTHLY || '']: 'B2C_FAMILLE_PLUS',
    [process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY || '']: 'B2C_FAMILLE_PLUS',
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || '']: 'B2B_STARTER',
    [process.env.STRIPE_PRICE_STARTER_YEARLY || '']: 'B2B_STARTER',
    [process.env.STRIPE_PRICE_TEAM_MONTHLY || '']: 'B2B_TEAM',
    [process.env.STRIPE_PRICE_TEAM_YEARLY || '']: 'B2B_TEAM',
    [process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '']: 'B2B_BUSINESS',
    [process.env.STRIPE_PRICE_BUSINESS_YEARLY || '']: 'B2B_BUSINESS',
  };

  return planMap[priceId] || null;
}
