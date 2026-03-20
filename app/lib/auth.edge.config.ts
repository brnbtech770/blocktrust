/**
 * Fragment de config NextAuth sans dépendances lourdes (Prisma, bcrypt).
 */
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const googleProvider = GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  allowDangerousEmailAccountLinking: true,
  authorization: {
    params: {
      prompt: "select_account",
      access_type: "offline",
      response_type: "code",
    },
  },
});

/** Base partagée ; instance complète = auth-server (adapter Prisma, credentials, etc.). */
const authEdgeConfig = {
  trustHost: true,
  providers: [googleProvider],
  pages: {
    signIn: "/auth/signin",
    // Ne pas réutiliser la page sign-in : risque ErrorPageLoop / error=Configuration (voir Auth.js).
    error: "/auth/error",
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Ne pas utiliser ?? : si session.user.email est "" (profil OAuth partiel),
        // ?? ne retombe pas sur token.email → session sans email → redirect sign-in.
        const sessionEmail =
          typeof session.user.email === "string" ? session.user.email.trim() : "";
        const tokenEmail =
          typeof token.email === "string" ? token.email.trim() : "";
        const resolvedEmail = sessionEmail || tokenEmail || "";

        return {
          ...session,
          user: {
            ...session.user,
            id: (token.sub ?? (token as any).id ?? "") as string,
            email: resolvedEmail,
            plan: (token as any).plan ?? "ESSENTIEL",
            kycStatus: (token as any).kycStatus ?? "PENDING",
            accountType: (token as any).accountType ?? "PERSONAL",
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
