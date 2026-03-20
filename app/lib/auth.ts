import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isAdmin } from "./admin";

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

// allowDangerousEmailAccountLinking : uniquement sur GoogleProvider (pas d’option globale Auth.js v5)
export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      /** Permet de lier un compte Google à un utilisateur existant (même email, ex. email/password). */
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account", // Force la sélection de compte à chaque connexion
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
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
        // Première connexion Google - créer ou mettre à jour l'utilisateur en DB
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });
          const dbUser = await prisma.user.upsert({
            where: { email: user.email! },
            create: {
              email: user.email!,
              name: user.name,
              image: user.image,
            },
            update: {
              name: user.name,
              image: user.image,
            },
          });
          token.sub = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.picture = dbUser.image;
          (token as any).kycStatus = (dbUser as any).kycStatus ?? 'PENDING';
          (token as any).accountType = dbUser.accountType ?? 'PERSONAL';
          console.log('✅ User created/updated in DB:', dbUser.email);

          // Email de bienvenue pour les nouveaux utilisateurs (fire-and-forget)
          if (!existingUser && dbUser.email) {
            const { sendEmailFireAndForget } = await import('@/lib/email');
            const { WelcomeEmail, subject: welcomeSubject } = await import('@/emails/WelcomeEmail');
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech';
            sendEmailFireAndForget({
              to: dbUser.email,
              subject: welcomeSubject,
              react: WelcomeEmail({
                userName: dbUser.name,
                dashboardUrl: `${baseUrl}/dashboard`,
              }),
            });
          }
        } catch (error) {
          console.error('❌ Error creating/updating user in DB:', error);
          // En cas d'erreur, on continue avec les infos du token
          if (user.email) {
            token.email = user.email;
            token.name = user.name;
            token.picture = user.image;
          }
        }
        }
      }
      // Rafraîchir plan + KYC à chaque requête
      if (token.sub) {
        try {
          const [sub, dbUser] = await Promise.all([
            prisma.subscription.findUnique({
              where: { userId: token.sub },
              select: { plan: true },
            }),
            prisma.user.findUnique({
              where: { id: token.sub },
              select: { kycStatus: true, accountType: true },
            }),
          ]);
          (token as any).plan = sub?.plan ?? null;
          if (dbUser) {
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
      // Si l'URL contient un callbackUrl, l'utiliser
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Sinon, rediriger vers la base (le middleware gérera la redirection admin)
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/signin",
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
    // Fallback sur l'ancien système si NextAuth n'est pas encore configuré
    const userId = req.headers.get("x-user-id") || req.cookies.get("user-id")?.value;
    
    if (!userId) {
      return null;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          entities: true,
          plan: true,
        },
      });

      return user;
    } catch (error) {
      return null;
    }
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
    if (feature === 'unlimited' && planObj.type?.includes('PLUS') || planObj.type?.includes('BUSINESS') || planObj.type?.includes('ENTERPRISE')) return true;
    
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
    B2C_PREMIUM: ["basic", "advanced"],
    PREMIUM: ["basic", "advanced"],
    B2C_FAMILLE: ["basic", "advanced", "trustCircle"],
    FAMILLE: ["basic", "advanced", "trustCircle"],
    B2C_FAMILLE_PLUS: ["basic", "advanced", "trustCircle", "unlimited"],
    "FAMILLE_PLUS": ["basic", "advanced", "trustCircle", "unlimited"],
    B2B_STARTER: ["basic", "advanced"],
    STARTER: ["basic", "advanced"],
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
  const crypto = require("crypto");
  const salt = process.env.IP_HASH_SALT || "default-salt";
  return crypto.createHash("sha256").update(ip + salt).digest("hex");
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
