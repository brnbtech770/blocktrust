import { signOut } from "next-auth/react";

/**
 * Safari iOS signale un fetch annulé (déconnexion / navigation) comme
 * `TypeError: Load failed` non géré. On rattrape et on force l'accueil.
 */
export async function signOutToHome(): Promise<void> {
  try {
    await signOut({ callbackUrl: "/" });
  } catch {
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  }
}
