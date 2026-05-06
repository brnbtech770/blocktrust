// app/api/certificates/[id]/status/route.ts
// Change le statut d'un certificat
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import type { CertificateStatus, Prisma } from '@prisma/client';
import { getAuthUser } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { z } from 'zod';

const statusSchema = z
  .object({
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ANCHORED', 'EXPIRED']),
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
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, reason } = parsed.data;

    const certificate = await prisma.certificate.findFirst({
      where: {
        id,
        entity: { userId: user.id },
      },
      include: {
        entity: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: 'Certificat non trouvé' }, { status: 404 });
    }

    const currentStatus = certificate.status;

    // Passage PENDING → ACTIVE : réservé au flux admin uniquement
    if (currentStatus === 'PENDING' && status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Activation réservée aux administrateurs' },
        { status: 403 }
      );
    }

    // Vérifier les transitions de statut valides (utilisateur)
    const validTransitions: Record<string, string[]> = {
      PENDING: ['REVOKED'],
      ACTIVE: ['SUSPENDED', 'REVOKED'],
      ANCHORED: ['SUSPENDED', 'REVOKED'],
      SUSPENDED: ['ACTIVE', 'REVOKED'],
      REVOKED: [], // Statut final
      EXPIRED: [], // Statut final
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        {
          error: `Transition invalide de ${currentStatus} vers ${status}`,
          validTransitions: validTransitions[currentStatus] || [],
        },
        { status: 400 }
      );
    }

    const updateData: Prisma.CertificateUpdateInput = {
      status: status as CertificateStatus,
    };

    if (status === 'REVOKED') {
      updateData.revokedAt = new Date();
      if (reason) {
        updateData.revocationReason = reason;
      }
    } else if (String(currentStatus) === 'REVOKED' && String(status) !== 'REVOKED') {
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
    });
  } catch (error: any) {
    console.error('❌ Certificate status update error:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du statut',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
