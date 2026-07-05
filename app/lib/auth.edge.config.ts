import "./auth-env-shim";
/**
 * Fragment de config NextAuth sans dépendances lourdes (Prisma, bcrypt).
 */
import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

export const googleProvider =
  clientId && clientSecret
    ? GoogleProvider({
        clientId,
        clientSecret,
        // Opt-in explicite — true par défaut : Google vérifie l'email, permet la liaison
        // avec un compte credentials existant (même adresse).
        allowDangerousEmailAccountLinking:
          process.env.ALLOW_DANGEROUS_EMAIL_LINKING !== "false",
      })
    : null;

console.log(
  "[AUTH EDGE] GOOGLE_CLIENT_ID:",
  process.env.GOOGLE_CLIENT_ID ? "présent" : "ABSENT"
);
console.log(
  "[AUTH EDGE] googleProvider:",
  googleProvider ? "défini" : "NULL"
);

/** Base partagée ; instance complète = auth-server (adapter Prisma, credentials, etc.). */
const authEdgeConfig = {
  trustHost: true,
  providers: [...(googleProvider ? [googleProvider] : [])],
  pages: {
    signIn: "/auth/signin",
    // Ne pas réutiliser la page sign-in : risque ErrorPageLoop / error=Configuration (voir Auth.js).
    error: "/auth/error",
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        const jwt = token as JWT;
        // Ne pas utiliser ?? : si session.user.email est "" (profil OAuth partiel),
        // ?? ne retombe pas sur token.email → session sans email → redirect sign-in.
        const sessionEmail =
          typeof session.user.email === "string" ? session.user.email.trim() : "";
        const tokenEmail =
          typeof jwt.email === "string" ? jwt.email.trim() : "";
        const resolvedEmail = sessionEmail || tokenEmail || "";

        return {
          ...session,
          user: {
            ...session.user,
            id: (jwt.sub ?? jwt.id ?? "") as string,
            email: resolvedEmail,
            plan: jwt.plan ?? "ESSENTIEL",
            kycStatus: jwt.kycStatus ?? "PENDING",
            accountType: jwt.accountType ?? "PERSONAL",
            cookieConsent: jwt.cookieConsent ?? false,
          },
        };
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      try {
        if (url.startsWith("/")) {
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
} satisfies NextAuthConfig;

export default authEdgeConfig;
