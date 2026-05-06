// Sélections Prisma pour l’admin : ne jamais charger le mot de passe ni les hash sensibles.
import type { Prisma } from "@prisma/client";

/** Liste utilisateurs (compteurs sans charger le corps des certificats). */
export const adminUserListSelect = {
  id: true,
  name: true,
  email: true,
  planId: true,
  createdAt: true,
  plan: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  entities: {
    select: {
      _count: { select: { certificates: true } },
    },
  },
} satisfies Prisma.UserSelect;

/** Détail utilisateur admin (sans `password`). */
export const adminUserDetailSelect = {
  id: true,
  name: true,
  email: true,
  planId: true,
  stripeCustomerId: true,
  createdAt: true,
  plan: true,
  entities: {
    select: {
      id: true,
      legalName: true,
      firstName: true,
      lastName: true,
      tradeName: true,
      email: true,
      entityType: true,
      trustScore: {
        select: {
          score: true,
          level: true,
        },
      },
      certificates: {
        select: {
          id: true,
          verificationCount: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;
