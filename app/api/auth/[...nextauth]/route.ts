// app/api/auth/[...nextauth]/route.ts
// Route NextAuth pour l'authentification
// ============================================================

import { handlers } from "@/app/lib/auth-server";

export const GET = handlers.GET;
export const POST = handlers.POST;
