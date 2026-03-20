// app/lib/auth-server.ts
// Exporte auth() et handlers pour éviter les dépendances circulaires
// ============================================================

import "./auth-env-shim";
import NextAuth from "next-auth";
import { authOptions } from "./auth";

// Créer auth(), handlers, signIn, signOut depuis authOptions
export const { auth, handlers, signIn, signOut } = NextAuth(authOptions);
