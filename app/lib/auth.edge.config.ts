/**
 * Fragment de config NextAuth sans dépendances Node (Prisma, bcrypt, crypto).
 * Réutilisé par auth.ts via spread. Peut servir à une future couche Edge si besoin.
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
    error: "/auth/signin",
  },
  session: {
    strategy: "jwt" as const,
  },
  // Auth.js v5 : AUTH_SECRET documenté en premier ; garder les deux alignés en prod (voir ENV_CHECKLIST).
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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

        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/bcf6afcf-d9fe-4562-9afc-d7d8113f78b5", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "467f2c",
          },
          body: JSON.stringify({
            sessionId: "467f2c",
            hypothesisId: "H1",
            location: "auth.edge.config.ts:session",
            message: "OAuth session email merge",
            data: {
              sessionEmailLen: sessionEmail.length,
              tokenEmailLen: tokenEmail.length,
              resolvedLen: resolvedEmail.length,
              source: sessionEmail
                ? "session"
                : tokenEmail
                  ? "token"
                  : "none",
            },
            timestamp: Date.now(),
            runId: "verify-post-fix",
          }),
        }).catch(() => {});
        // #endregion

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
