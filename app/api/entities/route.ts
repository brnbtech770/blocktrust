// app/api/entities/route.ts
// CRUD pour les entités (B2C et B2B)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth-server';
import { prisma } from '@/app/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { checkEntityQuota } from '@/lib/checkQuota';
import { validateWalletPair } from '@/lib/wallet-validation';
import { validateCertifiedContactArrays } from '@/lib/certified-contact';

// ─────────────────────────────────────────────
// Schémas de validation
// ─────────────────────────────────────────────
const walletFields = {
  walletAddress: z.string().max(200).optional().nullable(),
  walletNetwork: z.string().max(32).optional().nullable(),
  certifiedDomains: z.array(z.string()).max(10).optional(),
  certifiedEmails: z.array(z.string()).max(10).optional(),
  certifiedPhones: z.array(z.string()).max(10).optional(),
};

const individualSchema = z.object({
  entityType: z.literal('INDIVIDUAL'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  website: z.string().max(500).optional().nullable().or(z.literal('')),
  description: z.string().max(1000).optional().nullable(),
  ...walletFields,
});

const businessSchema = z.object({
  entityType: z.literal('BUSINESS'),
  legalName: z.string().min(1).max(255),
  tradeName: z.string().max(255).optional().nullable(),
  siret: z.string().length(14).regex(/^\d{14}$/), // Exactement 14 chiffres
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  website: z.string().url(), // Requis pour BUSINESS
  description: z.string().max(1000).optional().nullable(),
  ...walletFields,
});

const createEntitySchema = z.discriminatedUnion('entityType', [
  individualSchema,
  businessSchema,
]);

// ─────────────────────────────────────────────
// POST — Créer une entité
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification avec NextAuth v5
    // auth() lit automatiquement les cookies depuis les headers de la requête
    const session = await auth();
    
    console.log('🔍 Session check:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      email: session?.user?.email,
      cookies: req.cookies.getAll().map(c => c.name)
    });
    
    if (!session?.user?.id) {
      console.error('❌ No session found:', { 
        session, 
        cookies: req.cookies.getAll(),
        headers: Object.fromEntries(req.headers.entries())
      });
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        entities: true,
        plan: true,
      },
    });

    if (!user) {
      console.error('❌ User not found in database:', session.user.id);
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Valider le body
    const body = await req.json();
    const parsed = createEntitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: parsed.error.flatten() 
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const walletCheck = validateWalletPair(data.walletAddress, data.walletNetwork);
    if (!walletCheck.ok) {
      return NextResponse.json({ error: walletCheck.message }, { status: 400 });
    }

    const certified = validateCertifiedContactArrays({
      certifiedDomains: data.certifiedDomains,
      certifiedEmails: data.certifiedEmails,
      certifiedPhones: data.certifiedPhones,
    });
    if (!certified.ok) {
      return NextResponse.json(
        { error: `${certified.error.field}: ${certified.error.reason}` },
        { status: 400 },
      );
    }

    const walletAddressNorm = (data.walletAddress ?? '').trim() || null;
    const walletNetworkNorm = (data.walletNetwork ?? '').trim().toLowerCase() || null;

    // Vérifier le quota selon le plan
    const quotaCheck = await checkEntityQuota(user.id);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.reason || 'Quota dépassé',
          code: 'QUOTA_EXCEEDED',
          current: quotaCheck.current,
          max: quotaCheck.max,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      );
    }

    // Préparer les données selon le type
    let entityData: Prisma.EntityUncheckedCreateInput;

    if (data.entityType === 'INDIVIDUAL') {
      // Vérifier si un particulier avec cet email existe déjà
      const existing = await prisma.entity.findFirst({
        where: {
          email: data.email,
          userId: user.id,
          entityType: 'INDIVIDUAL',
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Un profil avec cet email existe déjà' },
          { status: 409 }
        );
      }

      // Normaliser le website (peut être vide string ou null)
      let website = data.website;
      if (website === '' || !website) {
        website = null;
      } else if (!website.startsWith('http://') && !website.startsWith('https://')) {
        // Ajouter https:// si manquant
        website = `https://${website}`;
      }

      entityData = {
        userId: user.id,
        entityType: 'INDIVIDUAL',
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        website: website,
        description: data.description || null,
        walletAddress: walletAddressNorm,
        walletNetwork: walletNetworkNorm,
        certifiedDomains: certified.value.domains,
        certifiedEmails: certified.value.emails,
        certifiedPhones: certified.value.phones,
        kycStatus: 'PENDING',
        validationLevel: 'BRONZE',
      };
    } else {
      // Vérifier si une entreprise avec ce SIRET existe déjà
      const existing = await prisma.entity.findFirst({
        where: {
          siret: data.siret,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Ce SIRET est déjà enregistré' },
          { status: 409 }
        );
      }

      // Vérifier si une entreprise avec cet email existe déjà pour cet utilisateur
      const existingEmail = await prisma.entity.findFirst({
        where: {
          email: data.email,
          userId: user.id,
          entityType: 'BUSINESS',
        },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Une entreprise avec cet email existe déjà' },
          { status: 409 }
        );
      }

      // Normaliser le website (ajouter https:// si manquant)
      let website = data.website;
      if (!website.startsWith('http://') && !website.startsWith('https://')) {
        website = `https://${website}`;
      }

      entityData = {
        userId: user.id,
        entityType: 'BUSINESS',
        legalName: data.legalName,
        tradeName: data.tradeName || null,
        siret: data.siret,
        email: data.email,
        phone: data.phone || null,
        website: website,
        description: data.description || null,
        walletAddress: walletAddressNorm,
        walletNetwork: walletNetworkNorm,
        certifiedDomains: certified.value.domains,
        certifiedEmails: certified.value.emails,
        certifiedPhones: certified.value.phones,
        kycStatus: 'PENDING',
        validationLevel: 'BRONZE',
      };
    }

    // Créer l'entité
    const entity = await prisma.entity.create({
      data: entityData,
    });

    // Créer le TrustScore initial
    await prisma.trustScore.create({
      data: {
        entityId: entity.id,
        score: 50,
        level: 'STANDARD',
        kycScore: 0,
        historyScore: 0,
        interactionScore: 0,
        behaviorScore: 0,
        networkScore: 0,
      },
    });

    // Créer un certificat automatiquement avec status PENDING
    // Seul l'admin peut passer en ACTIVE via /api/admin/certificates/[id]
    const certificate = await prisma.certificate.create({
      data: {
        entityId: entity.id,
        status: 'PENDING', // PAS 'ACTIVE' - seul l'admin peut activer
        level: 'BRONZE',
      },
    });

    // Créer le TrustScore initial et le calculer
    const { updateTrustScore } = await import('@/app/lib/trust-score')
    await updateTrustScore(entity.id)

    return NextResponse.json({
      success: true,
      entity: {
        id: entity.id,
        entityType: entity.entityType,
        ...(entity.entityType === 'INDIVIDUAL'
          ? {
              firstName: entity.firstName,
              lastName: entity.lastName,
            }
          : {
              legalName: entity.legalName,
              tradeName: entity.tradeName,
              siret: entity.siret,
            }),
        email: entity.email,
      },
      certificate: {
        id: certificate.id,
        publicId: certificate.publicId,
        status: certificate.status,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Entity creation error:', error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('siret')) {
        return NextResponse.json(
          { error: 'Ce SIRET est déjà enregistré' },
          { status: 409 }
        );
      }
      if (Array.isArray(target) && target.includes('email')) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 409 }
        );
      }
    }

    const message = error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      {
        error: 'Erreur lors de la création de l\'entité',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// GET — Liste des entités de l'utilisateur
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification avec NextAuth v5
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const entities = await prisma.entity.findMany({
      where: { userId: session.user.id },
      include: {
        certificates: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(entities);
  } catch (error) {
    console.error('❌ Entities list error:', error);
    return NextResponse.json(
      { error: 'Erreur récupération entités' },
      { status: 500 }
    );
  }
}
