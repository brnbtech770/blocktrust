import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  // TODO: Ajouter vérification auth quand implémentée
  // Pour l'instant, on laisse passer toutes les requêtes
  // mais le middleware est prêt pour l'auth future
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
