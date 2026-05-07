// GET / PATCH — Entité par id (propriétaire uniquement)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { z } from "zod";
import { validateWalletPair } from "@/lib/wallet-validation";
import type { Prisma } from "@prisma/client";

const patchEntitySchema = z
  .object({
    walletAddress: z.string().max(200).optional().nullable(),
    walletNetwork: z.string().max(32).optional().nullable(),
    phone: z.string().max(80).optional().nullable(),
    website: z.string().max(500).optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    firstName: z.string().max(100).optional().nullable(),
    lastName: z.string().max(100).optional().nullable(),
    legalName: z.string().max(255).optional().nullable(),
    tradeName: z.string().max(255).optional().nullable(),
  })
  .strict();

function normalizeWebsite(raw: string | null | undefined): string | null {
  if (raw == null || raw.trim() === "") return null;
  const t = raw.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  return `https://${t}`;
}

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
  if (Object.keys(p).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
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
    updateData.description =
      p.description === null ? null : p.description.trim() || null;
  }

  if (p.website !== undefined) {
    if (p.website === null || p.website.trim() === "") {
      updateData.website =
        entity.entityType === "BUSINESS" ? entity.website : null;
      if (entity.entityType === "BUSINESS" && !updateData.website) {
        return NextResponse.json(
          { error: "Le site web est obligatoire pour une entreprise." },
          { status: 400 },
        );
      }
    } else {
      updateData.website = normalizeWebsite(p.website);
    }
  }

  if (entity.entityType === "INDIVIDUAL") {
    if (p.firstName !== undefined) {
      const v = (p.firstName ?? "").trim();
      if (!v)
        return NextResponse.json({ error: "Prénom invalide." }, { status: 400 });
      updateData.firstName = v;
    }
    if (p.lastName !== undefined) {
      const v = (p.lastName ?? "").trim();
      if (!v)
        return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
      updateData.lastName = v;
    }
  } else if (entity.entityType === "BUSINESS") {
    if (p.legalName !== undefined) {
      const v = (p.legalName ?? "").trim();
      if (!v)
        return NextResponse.json(
          { error: "Nom légal invalide." },
          { status: 400 },
        );
      updateData.legalName = v;
    }
    if (p.tradeName !== undefined) {
      updateData.tradeName =
        p.tradeName === null ? null : p.tradeName.trim() || null;
    }
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
