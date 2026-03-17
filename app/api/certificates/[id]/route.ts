// app/api/certificates/[id]/route.ts
// Gère les actions sur un certificat (PATCH)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/app/lib/auth';
import { prisma } from '@/app/lib/db';
import { z } from 'zod';

const actionSchema = z.object({
  action: z.enum(['activate', 'suspend', 'reactivate', 'revoke']),
  reason: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    // Vérifier l'authentification
    const user = await getAuthUser(req);
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, reason } = parsed.data;

    // Récupérer le certificat et vérifier qu'il appartient à l'utilisateur
    const certificate = await prisma.certificate.findUnique({
      where: { id },
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

    if (certificate.entity.userId !== user.id) {
      return NextResponse.json(
        { error: 'Non autorisé à modifier ce certificat' },
        { status: 403 }
      );
    }

    // Déterminer le nouveau statut selon l'action et le statut actuel
    let newStatus: string;
    const currentStatus = certificate.status;

    switch (action) {
      case 'activate':
        if (currentStatus !== 'PENDING') {
          return NextResponse.json(
            { error: `Impossible d'activer un certificat avec le statut ${currentStatus}` },
            { status: 400 }
          );
        }
        newStatus = 'ACTIVE';
        break;

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

    // Préparer les données de mise à jour
    const updateData: any = {
      status: newStatus,
    };

    // Si révocation, ajouter la date et la raison
    if (action === 'revoke') {
      updateData.revokedAt = new Date();
      if (reason) {
        updateData.revocationReason = reason;
      }
    } else if (String(currentStatus) === 'REVOKED' && newStatus !== 'REVOKED') {
      // Si on sort de REVOKED, supprimer les champs de révocation
      updateData.revokedAt = null;
      updateData.revocationReason = null;
    }

    // Mettre à jour le certificat
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
  } catch (error: any) {
    console.error('❌ Certificate action error:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du certificat',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}
