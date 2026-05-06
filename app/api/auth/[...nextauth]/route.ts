// app/api/auth/[...nextauth]/route.ts
// Route NextAuth pour l'authentification
// ============================================================
//
// Les callbackUrl et redirections après connexion sont validés côté serveur dans
// app/lib/auth.ts (callbacks.redirect) via isSafeCallbackUrl (app/lib/auth-callback-url.ts).

import { handlers } from "@/app/lib/auth-server";

export const GET = handlers.GET;
export const POST = handlers.POST;
