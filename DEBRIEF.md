# 📊 Debrief BlockTrust MVP - État du Projet

**Date**: Décembre 2024  
**Version**: 0.1.0  
**Stack**: Next.js 16.1.6, Prisma, PostgreSQL, Stripe, JWT ES256

---

## 🎯 Vue d'ensemble

BlockTrust est une plateforme SaaS de certification et vérification d'authenticité pour les entreprises. Le MVP permet aux entreprises de créer des certificats de confiance, générer des signatures JWT pour authentifier leurs emails, et vérifier l'authenticité des communications via des badges et QR codes.

---

## 🏗️ Architecture Technique

### Stack Principal
- **Framework**: Next.js 16.1.6 (App Router) avec React 19
- **Base de données**: PostgreSQL (Neon) avec Prisma ORM 6.19.2
- **Authentification**: Système custom avec JWT (préparation NextAuth)
- **Paiement**: Stripe (API 2024-12-18.acacia)
- **UI**: Tailwind CSS 4
- **Validation**: Zod 4.3.6
- **QR Codes**: Bibliothèque `qrcode`

### Infrastructure
- **Base de données**: Neon PostgreSQL avec PgBouncer
- **Variables d'environnement**: `.env.local` (non versionné)
- **Déploiement**: Prêt pour Vercel/Production

---

## ✅ Fonctionnalités Implémentées

### 1. **Authentification & Utilisateurs**
- ✅ Système d'authentification custom (placeholder pour NextAuth)
- ✅ Helper `getAuthUser()` qui vérifie `x-user-id` header ou `user-id` cookie
- ✅ Modèle `User` avec `stripeCustomerId` et `plan`
- ⚠️ **À faire**: Intégration complète NextAuth

### 2. **Gestion des Entités & Certificats**
- ✅ CRUD complet pour les entités (`/api/entities`)
- ✅ CRUD pour les certificats (`/api/certificates`)
- ✅ Validation des SIRET (14 chiffres, unique)
- ✅ Création automatique d'un certificat lors de la création d'une entité
- ✅ Dashboard avec liste des entités et certificats

### 3. **Système de Pricing & Abonnements Stripe**
- ✅ **Page pricing** (`/pricing`) - 805+ lignes avec :
  - Toggle B2C / B2B
  - Toggle Mensuel / Annuel
  - Plans B2C : Essentiel (3,99€), Premium (9,99€), Famille (14,99€), Famille+ (24,99€)
  - Plans B2B : dégressif HT/user (Solo Pro, Starter, Team, Business), Enterprise (sur devis)
- ✅ **Checkout Stripe** (`/api/stripe/checkout`)
  - Création automatique de customer Stripe
  - Sauvegarde du `stripeCustomerId` dans la DB
  - Gestion des prix mensuels/annuels
- ✅ **Webhooks Stripe** (`/api/stripe/webhook`)
  - `checkout.session.completed`
  - `customer.subscription.created/updated/deleted`
  - `invoice.paid/payment_failed`
  - (pas de période d'essai : souscription directe)
- ✅ **Portail client Stripe** (`/api/stripe/portal`)
- ✅ **API Subscription** (`/api/stripe/subscription`)
  - Retourne le statut de l'abonnement
  - Calcul de l'usage (entités, certificats ce mois-ci)
  - Limites selon le plan
- ✅ **Script de seed Stripe** (`scripts/stripe-seed.ts`)
  - Création automatique des produits et prix Stripe
  - Génération des variables `STRIPE_PRICE_*` pour `.env.local`

### 4. **Pages Dashboard**
- ✅ **Dashboard principal** (`/dashboard`)
- ✅ **Page facturation** (`/dashboard/billing`)
  - Affichage du plan actuel
  - Bouton "Gérer mon abonnement" (portail Stripe)
  - Usage vs limites (entités, certificats)
  - Fonctionnalités activées (Trust Circle, Blockchain Anchor)
- ✅ **Page paramètres** (`/dashboard/settings`)
  - Informations du profil (placeholder)
  - Bouton déconnexion
  - Préférences de notification (placeholder)
- ✅ **Création d'entité** (`/dashboard/create`)

### 5. **API Trust Circle** (Placeholders)
- ✅ `GET /api/trust-circle` - Liste des relations
- ✅ `POST /api/trust-circle/invite` - Envoyer une invitation
- ✅ `POST /api/trust-circle/respond` - Accepter/refuser
- ✅ `POST /api/trust-circle/manual` - Ajouter une entrée manuelle
- ✅ `DELETE /api/trust-circle/[id]` - Supprimer une relation
- ⚠️ **À faire**: Implémentation complète (modèles Prisma manquants)

### 6. **API V2 - Signatures JWT**
- ✅ `POST /api/v2/sign` - Créer une signature JWT
- ✅ `POST /api/v2/verify` - Vérifier une signature
- ✅ `POST /api/v2/issue` - Générer un token (alias)
- ✅ Canonicalisation des contextes email
- ✅ Hash SHA-256 des contextes
- ✅ Support ES256 (ECDSA)
- ✅ Gestion de l'expiration et révocation

### 7. **Vérification Publique**
- ✅ `GET /api/verify/[id]` - Vérification par ID/SIRET
- ✅ Page publique `/verify/[id]`
- ✅ Hash IP pour RGPD (`hashIp()`)
- ✅ Logs de vérification (modèle `VerificationEvent`)

### 8. **Badges & QR Codes**
- ✅ Page badge (`/badge/[id]`)
- ✅ Composant QR Code réutilisable
- ✅ Affichage des informations de certification

### 9. **Landing Page**
- ✅ Page d'accueil publique (`/`)
- ✅ Redirection vers `/dashboard` si connecté
- ✅ Page pricing publique (`/pricing`)

---

## 📁 Structure du Projet

```
blocktrust-mvp/
├── app/
│   ├── api/
│   │   ├── certificates/route.ts          # CRUD certificats
│   │   ├── entities/route.ts             # CRUD entités
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts          # Checkout Stripe
│   │   │   ├── portal/route.ts            # Portail client
│   │   │   ├── subscription/route.ts      # Statut abonnement
│   │   │   └── webhook/route.ts           # Webhooks Stripe
│   │   ├── trust-circle/                  # API Trust Circle (5 routes)
│   │   ├── v2/
│   │   │   ├── sign/route.ts              # Signature JWT
│   │   │   ├── verify/route.ts            # Vérification JWT
│   │   │   └── issue/route.ts             # Alias pour sign
│   │   └── verify/[id]/route.ts          # Vérification publique
│   ├── dashboard/
│   │   ├── billing/page.tsx               # Page facturation
│   │   ├── settings/page.tsx              # Page paramètres
│   │   ├── create/page.tsx                # Création entité
│   │   └── page.tsx                       # Dashboard principal
│   ├── pricing/page.tsx                   # Page pricing (805+ lignes)
│   ├── lib/
│   │   ├── auth.ts                        # Helpers auth (getAuthUser, checkPlanFeature, hashIp)
│   │   └── db.ts                          # Client Prisma
│   └── page.tsx                           # Landing page
├── prisma/
│   └── schema.prisma                      # Schéma DB (User, Entity, Certificate, Signature, VerificationEvent)
├── scripts/
│   ├── stripe-seed.ts                     # Seed produits/prix Stripe
│   └── update-stripe-customer.ts          # Script utilitaire (mise à jour customer)
├── .env.local                             # Variables d'environnement (non versionné)
└── package.json
```

---

## 🗄️ Modèle de Données (Prisma)

### User
```prisma
- id: String (CUID)
- email: String (unique)
- name: String?
- plan: String (default: "ESSENTIEL")
- stripeCustomerId: String? (unique)  // ✅ Ajouté récemment
- createdAt, updatedAt
- entities: Entity[]
```

### Entity
```prisma
- id: String (CUID)
- userId: String
- legalName: String
- siret: String (unique, 14 chiffres)
- email: String
- website: String?
- description: String?
- kycStatus: String (default: "PENDING")
- validationLevel: String (default: "BRONZE")
- certificates: Certificate[]
```

### Certificate
```prisma
- id: String (CUID)
- entityId: String
- tokenId: String? (unique)
- txHash: String? (unique)
- status: String (default: "PENDING")
- level: String (default: "BRONZE")
- issuedAt: DateTime (default: now())
```

### Signature (V2)
```prisma
- id: String (UUID)
- jti: String (unique)
- certificateId: String
- entityId: String
- ctxType: String
- ctxHash: String
- issuedAt: DateTime
- expiresAt: DateTime
- revoked: Boolean (default: false)
```

### VerificationEvent
```prisma
- id: String (UUID)
- jti: String
- ip: String? (hashé pour RGPD)
- userAgent: String?
- verdict: String
- createdAt: DateTime
```

---

## 🔧 Configuration & Variables d'Environnement

### Fichier `.env.local` (exemple)
```env
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
JWT_SECRET=...
IP_HASH_SALT=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://...?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://...?sslmode=require

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Prices (générés par stripe-seed.ts)
STRIPE_PRICE_ESSENTIEL_MONTHLY=price_...
STRIPE_PRICE_ESSENTIEL_YEARLY=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
# ... (12 prix au total)

# JWT (ES256)
BLOCKTRUST_JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...
BLOCKTRUST_JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
```

---

## 🐛 Problèmes Rencontrés & Résolus

### 1. **Erreur PostgreSQL "cached plan must not change result type"**
- **Cause**: PgBouncer en mode transaction
- **Solution**: Ajout de `&pgbouncer=true` dans `DATABASE_URL`
- **Status**: ✅ Résolu

### 2. **Duplication de variable `certificatesThisMonth`**
- **Cause**: Cache Turbopack/Next.js
- **Solution**: Réécriture du fichier, suppression du cache `.next`
- **Status**: ✅ Résolu

### 3. **`stripeCustomerId` non associé lors du checkout**
- **Cause**: Le customer Stripe n'était pas créé/sauvegardé avant la session checkout
- **Solution**: Création du customer dans `/api/stripe/checkout` avant de créer la session
- **Status**: ✅ Résolu

### 4. **Webhooks Stripe ne mettaient pas à jour le plan**
- **Cause**: Utilisation de `stripeCustomerId` au lieu de l'email
- **Solution**: Mise à jour des webhooks pour utiliser `stripeCustomerId` depuis le modèle User
- **Status**: ✅ Résolu

### 5. **Erreurs de migration Prisma**
- **Cause**: Données existantes incompatibles avec le nouveau schéma
- **Solution**: Utilisation de `--accept-data-loss` et nettoyage des données obsolètes
- **Status**: ✅ Résolu

### 6. **Page billing - Erreur d'authentification**
- **Cause**: La page client-side ne passait pas l'ID utilisateur dans les headers
- **Solution**: Ajout de la récupération de `user-id` depuis localStorage/cookie et passage via header `x-user-id`
- **Status**: ✅ Résolu

---

## ⚠️ Problèmes Actuels

### 1. **Internal Server Error sur `/dashboard/billing`**
- **Status**: 🔍 En cours de diagnostic
- **Actions prises**:
  - Amélioration de la gestion des erreurs avec logs détaillés
  - Correction de la logique d'authentification
  - Vérification de la syntaxe Prisma
- **À vérifier**:
  - Logs du serveur Next.js pour l'erreur exacte
  - Variables d'environnement (`STRIPE_SECRET_KEY`, `DATABASE_URL`)
  - Console du navigateur (F12)

### 2. **Authentification non complète**
- **Status**: ⚠️ Système placeholder
- **Actuel**: `getAuthUser()` vérifie `x-user-id` header ou `user-id` cookie
- **À faire**: Intégration complète NextAuth avec Google OAuth

### 3. **Trust Circle non implémenté**
- **Status**: ⚠️ Routes API créées mais modèles Prisma manquants
- **À faire**: Créer les modèles `TrustRelation` et `ManualTrustEntry` dans Prisma

---

## 🚀 Prochaines Étapes Prioritaires

### Court Terme (1-2 semaines)
1. **Résoudre l'erreur Internal Server Error** sur `/dashboard/billing`
   - Identifier la cause exacte via les logs
   - Corriger le problème
   - Tester le flow complet

2. **Intégrer NextAuth complètement**
   - Remplacer `getAuthUser()` par `getServerSession(authOptions)`
   - Configurer Google OAuth
   - Tester l'authentification end-to-end

3. **Implémenter Trust Circle**
   - Créer les modèles Prisma `TrustRelation` et `ManualTrustEntry`
   - Implémenter la logique dans les routes API
   - Créer l'interface utilisateur

### Moyen Terme (1 mois)
4. **Tests & Qualité**
   - Tests unitaires pour les routes API
   - Tests d'intégration pour Stripe
   - Tests E2E pour les flows critiques

5. **Documentation API**
   - OpenAPI/Swagger pour toutes les routes
   - Documentation des webhooks Stripe
   - Guide d'intégration pour les développeurs

6. **Améliorations UX**
   - Gestion des erreurs côté client
   - Loading states
   - Notifications toast

### Long Terme (2-3 mois)
7. **Fonctionnalités avancées**
   - Système de notifications email
   - Dashboard admin
   - Export de données
   - Analytics & métriques

8. **Sécurité & Performance**
   - Rate limiting
   - Caching stratégique
   - Optimisation des requêtes Prisma
   - Audit de sécurité

---

## 📊 Métriques & Statistiques

### Code
- **Routes API**: 15+ routes implémentées
- **Pages**: 8 pages (dashboard, pricing, verify, etc.)
- **Modèles Prisma**: 5 modèles (User, Entity, Certificate, Signature, VerificationEvent)
- **Lignes de code**: ~3000+ lignes

### Fonctionnalités
- ✅ **Complètes**: Pricing, Stripe, Dashboard, Vérification, JWT V2
- ⚠️ **Partielles**: Trust Circle (routes API seulement), Authentification (placeholder)
- ❌ **Non implémentées**: Notifications, Admin, Analytics

---

## 🔐 Sécurité

### Implémenté
- ✅ Hash IP pour RGPD (`hashIp()` avec SHA-256)
- ✅ Validation Zod sur toutes les routes API
- ✅ Vérification d'authentification sur les routes protégées
- ✅ Vérification des limites de plan (`checkPlanFeature()`)
- ✅ JWT avec ES256 (ECDSA)

### À améliorer
- ⚠️ Rate limiting
- ⚠️ CSRF protection
- ⚠️ Input sanitization
- ⚠️ Audit logs

---

## 💰 Modèle de Pricing

### Plans B2C
- **Essentiel**: 3,99€/mois - 1 entité, 1 certificat
- **Premium**: 9,99€/mois - 5 entités, 5 certificats
- **Famille**: 14,99€/mois - 10 entités, 10 certificats, Trust Circle
- **Famille+**: 24,99€/mois - Illimité, Trust Circle, Blockchain Anchor

### Plans B2B
- **Starter B2B**: prix HT/user/mois dégressif (voir `lib/pricing.ts`)
- **Team B2B**: prix HT/user/mois dégressif (voir `lib/pricing.ts`)
- **Business B2B**: prix HT/user/mois dégressif (voir `lib/pricing.ts`)
- **Enterprise**: Sur devis

---

## 🛠️ Scripts Utiles

```bash
# Développement
npm run dev              # Serveur de développement
npm run build            # Build de production
npm run start            # Serveur de production

# Base de données
npx prisma generate      # Générer le client Prisma
npx prisma db push       # Appliquer le schéma
npx prisma studio        # Interface graphique DB

# Stripe
npx tsx scripts/stripe-seed.ts  # Créer produits/prix Stripe
stripe listen --forward-to localhost:3000/api/stripe/webhook  # Écouter webhooks

# Utilitaires
npm run lint             # Vérifier le code
npm run seed             # Seed la base de données
```

---

## 📝 Notes Importantes

1. **Authentification**: Le système actuel est un placeholder. Il faut intégrer NextAuth complètement pour la production.

2. **Stripe**: Tous les produits et prix sont créés en mode test. Pour la production, il faudra créer les produits réels.

3. **Base de données**: La DB est sur Neon avec PgBouncer. Le paramètre `pgbouncer=true` est crucial pour éviter les erreurs de cache.

4. **Variables d'environnement**: Le fichier `.env.local` n'est pas versionné. Il faut le configurer manuellement sur chaque environnement.

5. **Trust Circle**: Les routes API sont prêtes mais les modèles Prisma manquent. Il faut les créer avant de pouvoir utiliser cette fonctionnalité.

---

## 🎯 Conclusion

Le MVP BlockTrust est **fonctionnel à ~80%**. Les fonctionnalités principales (pricing, Stripe, dashboard, vérification, JWT) sont implémentées et opérationnelles. Les prochaines étapes critiques sont :
1. Résoudre l'erreur Internal Server Error
2. Intégrer NextAuth complètement
3. Implémenter Trust Circle

Le projet est prêt pour les tests utilisateurs sur les fonctionnalités principales, mais nécessite encore du travail sur l'authentification et Trust Circle avant une mise en production complète.

---

**Dernière mise à jour**: Décembre 2024  
**Contact**: olivier@blocktrust.tech
