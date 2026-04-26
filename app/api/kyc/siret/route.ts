import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { verifySiret } from "@/lib/insee";

/**
 * POST /api/kyc/siret
 * Body : { siret: string, entityId?: string }
 *
 * 1. Auth obligatoire
 * 2. Abonnement actif requis
 * 3. Vérification via INSEE Sirene 3.11
 * 4. Si valide :
 *    - Persiste les infos dans User (siret, companyName)
 *    - Si `entityId` fourni & propriété de l'utilisateur : MAJ Entity
 *    - Cache la réponse INSEE complète dans la dernière KYCVerification PENDING (siretData/siretVerified)
 * 5. Retourne les données structurées
 */
const bodySchema = z.object({
  siret: z.string().trim().min(14).max(20),
  entityId: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètre `siret` requis" },
      { status: 400 },
    );
  }

  const { siret, entityId } = parsed.data;

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });
  if (!subscription || subscription.status !== "active") {
    return NextResponse.json(
      { error: "Abonnement actif requis pour vérifier un SIRET" },
      { status: 402 },
    );
  }

  const result = await verifySiret(siret);
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 200 });
  }

  // Persistance utilisateur — toujours
  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        siret: result.siret,
        companyName: result.raisonSociale,
      },
    });
  } catch (err) {
    console.error("[KYC SIRET] user update failed", { userId: session.user.id, err });
  }

  // MAJ entité si demandée et appartenant à l'utilisateur
  if (entityId) {
    try {
      const entity = await prisma.entity.findFirst({
        where: { id: entityId, userId: session.user.id },
        select: { id: true },
      });
      if (entity) {
        await prisma.entity.update({
          where: { id: entity.id },
          data: {
            siret: result.siret,
            legalName: result.raisonSociale,
            address: result.adresse || undefined,
            description: result.activite ? `APE ${result.activite}` : undefined,
          },
        });
      }
    } catch (err) {
      console.error("[KYC SIRET] entity update failed", { entityId, err });
    }
  }

  // Cache de la réponse INSEE dans la KYCVerification PENDING la plus récente
  try {
    const pending = await prisma.kYCVerification.findFirst({
      where: { userId: session.user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (pending) {
      await prisma.kYCVerification.update({
        where: { id: pending.id },
        data: {
          siretVerified: true,
          siretData: {
            siret: result.siret,
            siren: result.siren,
            raisonSociale: result.raisonSociale,
            adresse: result.adresse,
            activite: result.activite ?? null,
            dateCreation: result.dateCreation ?? null,
            etatAdministratif: result.etatAdministratif,
            verifiedAt: new Date().toISOString(),
            source: "insee_sirene_3.11",
          },
        },
      });
    }
  } catch (err) {
    console.error("[KYC SIRET] kyc cache failed", { err });
  }

  return NextResponse.json({
    valid: true,
    siret: result.siret,
    siren: result.siren,
    raisonSociale: result.raisonSociale,
    adresse: result.adresse,
    activite: result.activite ?? null,
    dateCreation: result.dateCreation ?? null,
    etatAdministratif: result.etatAdministratif,
  });
}

/**
 * GET /api/kyc/siret?siret=...
 * Conservé pour compat avec les anciens appels client.
 * Auth requise mais pas la subscription (lecture seule, pas de write DB).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const siret = req.nextUrl.searchParams.get("siret");
  if (!siret) {
    return NextResponse.json({ error: "Paramètre `siret` manquant" }, { status: 400 });
  }

  const result = await verifySiret(siret);
  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    siret: result.siret,
    siren: result.siren,
    raisonSociale: result.raisonSociale,
    companyName: result.raisonSociale, // alias rétro-compat
    adresse: result.adresse,
    address: result.adresse, // alias rétro-compat
    activite: result.activite ?? null,
    dateCreation: result.dateCreation ?? null,
    etatAdministratif: result.etatAdministratif,
    active: result.etatAdministratif === "Actif",
  });
}
