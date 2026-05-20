// app/api/certificates/[id]/route.ts
// Gère les actions sur un certificat (PATCH)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { CertificateStatus, Prisma } from '@prisma/client';
import { getAuthUser } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { z } from 'zod';

const actionSchema = z
  .object({
    action: z.enum(['suspend', 'reactivate', 'revoke']),
    reason: z.string().optional(),
  })
  .strict();

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    // Vérifier l'authentification
    const user = await getAuthUser(req);
    
    if (!user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
    }

    if (
      body &&
      typeof body === 'object' &&
      !Array.isArray(body) &&
      (body as { action?: unknown }).action === 'activate'
    ) {
      return NextResponse.json(
        { error: "L'activation est réservée à l'administration BlockTrust" },
        { status: 403 }
      );
    }

    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, reason } = parsed.data;

    const certificate = await prisma.certificate.findFirst({
      where: {
        id,
        entity: { userId: user.id },
      },
      include: {
        entity: {
          select: {
            userId: true,
            entityType: true,
            legalName: true,
            tradeName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificat non trouvé' }, { status: 404 });
    }

    // Déterminer le nouveau statut selon l'action et le statut actuel
    let newStatus: CertificateStatus;
    const currentStatus = certificate.status;

    switch (action) {
      case 'suspend':
        if (currentStatus !== 'ACTIVE' && currentStatus !== 'ANCHORED') {
          return NextResponse.json(
            { error: `Impossible de suspendre un certificat avec le statut ${currentStatus}` },
            { status: 400 }
          );
        }
        newStatus = 'SUSPENDED';
        break;

      case 'reactivate':
        if (currentStatus !== 'SUSPENDED') {
          return NextResponse.json(
            { error: `Impossible de réactiver un certificat avec le statut ${currentStatus}` },
            { status: 400 }
          );
        }
        newStatus = 'ACTIVE';
        break;

      case 'revoke':
        if (currentStatus === 'REVOKED' || currentStatus === 'EXPIRED') {
          return NextResponse.json(
            { error: 'Ce certificat est déjà révoqué ou expiré' },
            { status: 400 }
          );
        }
        newStatus = 'REVOKED';
        break;

      default:
        return NextResponse.json(
          { error: 'Action invalide' },
          { status: 400 }
        );
    }

    const updateData: Prisma.CertificateUpdateInput = {
      status: newStatus,
    };

    if (action === 'revoke') {
      updateData.revokedAt = new Date();
      if (reason) {
        updateData.revocationReason = reason;
      }
    } else if (String(currentStatus) === 'REVOKED' && newStatus !== 'REVOKED') {
      updateData.revokedAt = null;
      updateData.revocationReason = null;
    }

    const updatedCertificate = await prisma.certificate.update({
      where: { id },
      data: updateData,
      include: {
        entity: {
          select: {
            id: true,
            entityType: true,
            legalName: true,
            tradeName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      certificate: updatedCertificate,
      action,
      previousStatus: currentStatus,
      newStatus,
    });
  } catch (error: unknown) {
    console.error('❌ Certificate action error:', error);
    const message = error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du certificat',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    );
  }
}
