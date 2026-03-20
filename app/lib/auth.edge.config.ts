/**
 * Fragment de config NextAuth sans dépendances lourdes (Prisma, bcrypt).
 * `writeAgentDebugLog` utilise fs : ne pas importer ce fichier depuis du middleware Edge.
 */
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { writeAgentDebugLog } from "@/app/lib/agent-debug-467f2c-log";

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
        const source = sessionEmail ? "session" : tokenEmail ? "token" : "none";

        // #region agent log
        await writeAgentDebugLog({
          hypothesisId: "H1",
          location: "auth.edge.config.ts:session",
          message: "OAuth session email merge",
          runId: "oauth-flow",
          data: {
            sessionEmailLen: sessionEmail.length,
            tokenEmailLen: tokenEmail.length,
            resolvedLen: resolvedEmail.length,
            hasSub: Boolean(token.sub && String(token.sub).length > 0),
            subLen: token.sub ? String(token.sub).length : 0,
            source,
          },
        });
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
