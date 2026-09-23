// GET / PATCH — Entité par id (propriétaire uniquement)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { z } from "zod";
import { validateWalletPair } from "@/lib/wallet-validation";
import type { Prisma } from "@prisma/client";
import {
  validateCertifiedContactArraysPartial,
} from "@/lib/certified-contact";
import { assertSafeDisplayText } from "@/lib/sanitize-display-text";
import { sameOriginMutationResponse } from "@/lib/csrf-origin-guard";

const patchEntitySchema = z
  .object({
    walletAddress: z.string().max(200).optional().nullable(),
    walletNetwork: z.string().max(32).optional().nullable(),
    phone: z.string().max(80).optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    firstName: z.string().max(100).optional().nullable(),
    lastName: z.string().max(100).optional().nullable(),
    legalName: z.string().max(255).optional().nullable(),
    tradeName: z.string().max(255).optional().nullable(),
    // website, certifiedEmails, certifiedDomains : lecture seule.
    // Réécriture uniquement après preuve de contrôle (DNS TXT / OTP email).
    certifiedPhones: z.array(z.string()).max(10).optional(),
  })
  .strict();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const entity = await prisma.entity.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!entity) {
    return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  }

  return NextResponse.json(entity);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrf = sameOriginMutationResponse(req);
  if (csrf) return csrf;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const entity = await prisma.entity.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!entity) {
    return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });
  }

  let bodyJson: unknown;
  try {
    bodyJson = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = patchEntitySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const p = parsed.data;
  const rawBody = bodyJson as Record<string, unknown>;
  const certPartial: Record<string, unknown> = {};
  if ("certifiedPhones" in rawBody)
    certPartial.certifiedPhones = rawBody.certifiedPhones;

  if (Object.keys(p).length === 0 && Object.keys(certPartial).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  let certifiedValue: Partial<{
    phones: string[];
  }> = {};
  if (Object.keys(certPartial).length > 0) {
    const cv = validateCertifiedContactArraysPartial(certPartial);
    if (!cv.ok) {
      return NextResponse.json(
        { error: `${cv.error.field}: ${cv.error.reason}` },
        { status: 400 },
      );
    }
    certifiedValue = cv.value;
  }

  const nextAddr =
    p.walletAddress !== undefined
      ? p.walletAddress === null
        ? null
        : p.walletAddress.trim() || null
      : entity.walletAddress;
  const nextNetRaw =
    p.walletNetwork !== undefined
      ? p.walletNetwork === null
        ? null
        : p.walletNetwork.trim() || null
      : entity.walletNetwork;

  const updateData: Prisma.EntityUpdateInput = {};

  if (p.walletAddress !== undefined || p.walletNetwork !== undefined) {
    const wCheck = validateWalletPair(nextAddr, nextNetRaw);
    if (!wCheck.ok) {
      return NextResponse.json({ error: wCheck.message }, { status: 400 });
    }
    updateData.walletAddress = nextAddr ?? null;
    updateData.walletNetwork = nextNetRaw
      ? nextNetRaw.toLowerCase()
      : null;
  }

  if (p.phone !== undefined) {
    updateData.phone = p.phone === null ? null : p.phone.trim() || null;
  }
  if (p.description !== undefined) {
    if (p.description === null || p.description.trim() === "") {
      updateData.description = null;
    } else {
      const check = assertSafeDisplayText(p.description, "Description");
      if (!check.ok)
        return NextResponse.json({ error: check.reason }, { status: 400 });
      updateData.description = check.value;
    }
  }

  if (entity.entityType === "INDIVIDUAL") {
    if (p.firstName !== undefined) {
      const check = assertSafeDisplayText(p.firstName ?? "", "Prénom");
      if (!check.ok)
        return NextResponse.json({ error: check.reason }, { status: 400 });
      updateData.firstName = check.value;
    }
    if (p.lastName !== undefined) {
      const check = assertSafeDisplayText(p.lastName ?? "", "Nom");
      if (!check.ok)
        return NextResponse.json({ error: check.reason }, { status: 400 });
      updateData.lastName = check.value;
    }
  } else if (entity.entityType === "BUSINESS") {
    if (p.legalName !== undefined) {
      const check = assertSafeDisplayText(p.legalName ?? "", "Nom légal");
      if (!check.ok)
        return NextResponse.json({ error: check.reason }, { status: 400 });
      updateData.legalName = check.value;
    }
    if (p.tradeName !== undefined) {
      if (p.tradeName === null || p.tradeName.trim() === "") {
        updateData.tradeName = null;
      } else {
        const check = assertSafeDisplayText(p.tradeName, "Nom commercial");
        if (!check.ok)
          return NextResponse.json({ error: check.reason }, { status: 400 });
        updateData.tradeName = check.value;
      }
    }
  }

  if (certifiedValue.phones !== undefined) {
    updateData.certifiedPhones = certifiedValue.phones;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({
      success: true,
      entity,
      message: "Aucune modification.",
    });
  }

  try {
    const updated = await prisma.entity.update({
      where: { id: entity.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      entity: updated,
    });
  } catch (e: unknown) {
    console.error("❌ PATCH entity:", e);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 },
    );
  }
}
