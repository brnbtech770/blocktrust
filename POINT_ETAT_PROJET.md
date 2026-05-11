# Point d’état projet BlockTrust — pour transmission à Claude IA

**Date** : 17 mars 2025  
**Objectif** : résumé précis de ce qui est opérationnel, ce qui ne l’est pas, et des blocages connus (pour travail en binôme Cursor / Claude).

---

## 1. Build et déploiement

| Élément | Statut | Détail |
|--------|--------|--------|
| **`npm run build`** | ❌ **Échoue** | Une seule erreur TypeScript bloque le build. |
| **Cause** | `app/admin/alerts/page.tsx` L.39 | `prisma.aIAlert.findMany({ include: { entity: {...}, certificate: {...} } })` — le modèle **AIAlert** dans `prisma/schema.prisma` n’a **pas** de reælations `entity` et `certificate` définies (seulement `entityId` et `certificateId`). Prisma génère donc un type où `include` pour ces champs est `never`. |
| **Correctif à faire** | Soit ajouter dans le schema : `entity Entity? @relation(...)` et `certificate Certificate? @relation(...)` sur **AIAlert** (et les relations inverses sur **Entity** et **Certificate**), soit enlever l’`include` et faire des requêtes séparées / manuelles par `entityId` / `certificateId`. |
| **`npm run dev`** | ✅ OK | Le serveur dev tourne (port 3004). Les pages s’affichent sauf celles qui dépendent du code en erreur. |

---

## 2. Authentification (NextAuth v5 + Google)

| Élément | Statut | Détail |
|--------|--------|--------|
| **Connexion / déconnexion** | ✅ Opérationnel | Google OAuth, session JWT, callback après login. |
| **Session en BDD** | ✅ Opérationnel | User créé/mis à jour en BDD au premier login (upsert par email). |
| **`session.user.plan`** | ✅ Opérationnel | Le plan abonnement est exposé dans la session (rempli via Subscription en BDD dans le callback JWT). Utilisé par la page Pricing pour afficher « Plan actuel ». |
| **Variables requises** | À configurer | `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (ex. `http://localhost:3004`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Voir `ENV_CHECKLIST.md`. |
| **Page signin dédiée** | ❌ Absente | NextAuth est configuré avec `pages.signIn: "/"`. Il n’y a pas de route `/auth/signin`. La page Pricing redirige les non-connectés via `signIn('google', { callbackUrl: '/pricing' })`. |

---

## 3. Base de données (Prisma 5 + PostgreSQL)

| Élément | Statut | Détail |
|--------|--------|--------|
| **Prisma / migrations** | ✅ Utilisé | Schema à jour, `prisma generate` et migrations appliquées en local / prod. |
| **Modèle User** | ✅ OK | Relations `subscription`, `plan`, `entities`, etc. |
| **Modèle Subscription** | ✅ OK | `userId`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`, `plan`, `status`, `currentPeriodEnd`. |
| **Modèle AIAlert** | ⚠️ Incomplet | Pas de relations Prisma vers `Entity` ni `Certificate`, d’où l’erreur de build sur `admin/alerts`. |
| **Variables** | À configurer | `DATABASE_URL`, `DIRECT_URL` (pour migrations). Sur Vercel/Neon, souvent `?sslmode=require&pgbouncer=true` pour `DATABASE_URL`. |

---

## 4. Stripe (paiements et abonnements)

| Élément | Statut | Détail |
|--------|--------|--------|
| **Checkout (création session)** | ✅ Opérationnel | `POST /api/stripe/create-checkout` avec body `{ priceId }`. Crée ou réutilise le customer Stripe, retourne `{ url }` vers Stripe Checkout. |
| **Webhook Stripe** | ✅ Implémenté | `POST /api/stripe/webhook` gère : `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, `customer.subscription.updated`. Met à jour `Subscription` en BDD et envoie l’email « Paiement réussi » (Resend). |
| **Variables requises** | À configurer | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ESSENTIEL`, `STRIPE_PRICE_PREMIUM`, `STRIPE_PRICE_FAMILLE`, `STRIPE_PRICE_FAMILLE_PLUS` (Price IDs mensuels). Voir `STRIPE_SETUP.md`. |
| **Page Pricing** | ✅ Opérationnel | 4 plans B2C (Essentiel 3,99 €, Premium 9,99 €, Famille 14,99 €, Famille+ 24,99 €). CTA selon état : non connecté → checkout ou sign-in ; connecté autre plan → « Choisir ce plan » (create-checkout) ; plan actuel → « Plan actuel » désactivé. Données plans servies par `GET /api/pricing` (depuis `lib/pricing.ts`). |

---

## 5. Emails transactionnels (Resend)

| Élément | Statut | Détail |
|--------|--------|--------|
| **Client et envoi** | ✅ Opérationnel | `lib/email.ts` : `sendEmail()`, `sendEmailFireAndForget()`. From : `BlockTrust <noreply@blocktrust.tech>`. |
| **Templates (React Email)** | ✅ Tous créés | `emails/WelcomeEmail.tsx`, `CertificateCreatedEmail.tsx`, `CertificateRevokedEmail.tsx`, `FraudAlertEmail.tsx`, `PaymentSuccessEmail.tsx`. Design sobre, bleu #1e40af, fond blanc. |
| **Intégrations** | ✅ En place | Bienvenue (1er login) dans `app/lib/auth.ts` ; certificat créé dans `app/api/certificates/route.ts` (POST) ; certificat révoqué dans `app/api/certificates/[id]/revoke/route.ts` ; alerte fraude dans `app/api/v2/verify/route.ts` (verdict TAMPERED/FRAUD_ALERT) ; paiement réussi dans `app/api/stripe/webhook/route.ts`. Envois en fire-and-forget (non bloquants). |
| **Variable** | Optionnelle | `RESEND_API_KEY`. Sans elle : logs en console, pas d’envoi réel. Voir `ENV_CHECKLIST.md`. |

---

## 6. Pages et routes

### Publiques

| Route | Statut | Remarque |
|-------|--------|----------|
| `/` | ✅ OK | Landing. |
| `/pricing` | ✅ OK | Tarifs B2C, FAQ, bandeau B2B. |
| `/verify`, `/verify/[id]` | ✅ OK | Vérification publique de certificat. |
| `/badge/[id]` | ✅ OK | Badge + QR. |

### Dashboard (protégé par middleware + auth)

| Route | Statut | Remarque |
|-------|--------|----------|
| `/dashboard` | ✅ OK | Tableau de bord. |
| `/dashboard/create` | ✅ OK | Création d’entité. |
| `/dashboard/entities` | ✅ OK | Liste entités. |
| `/dashboard/certificates` | ✅ OK | Liste certificats. |
| `/dashboard/certificate/[id]` | ✅ OK | Détail certificat. |
| `/dashboard/billing` | ✅ OK | Facturation. |
| `/dashboard/subscription` | ✅ OK | Abonnement (utilise `user.subscription`). |
| `/dashboard/trust-circle` | ✅ OK | Cercle de confiance. |
| `/dashboard/settings` | ✅ OK | Paramètres. |
| `/dashboard/badge/[id]` | ✅ OK | Badge. |

### Admin (protégé, réservé admins)

| Route | Statut | Remarque |
|-------|--------|----------|
| `/admin` | ✅ OK | Dashboard admin. |
| `/admin/users`, `/admin/users/[id]` | ✅ OK | Gestion utilisateurs. |
| `/admin/certificates`, `/admin/certificates/[id]` | ✅ OK | Gestion certificats. |
| **`/admin/alerts`** | ❌ **Bloqué par le build** | Dépend de la correction Prisma (AIAlert sans relations). Même après fix build, la page devra être testée. |

### API

| Route | Statut | Remarque |
|-------|--------|----------|
| `GET /api/pricing` | ✅ OK | Retourne les 4 plans (priceIds côté serveur). |
| `POST /api/stripe/create-checkout` | ✅ OK | Body `{ priceId }`. |
| `POST /api/stripe/webhook` | ✅ OK | Événements Stripe. |
| `GET/POST /api/certificates`, `POST /api/certificates/[id]/revoke` | ✅ OK | CRUD + révocation + email. |
| `POST /api/v2/issue`, `POST /api/v2/sign`, `POST /api/v2/verify` | ✅ OK | JWT issue/sign/verify ; alerte fraude → email. |
| Autres API (entities, trust-circle, auth, etc.) | ✅ Supposés OK | Non retestés récemment ; pas d’erreur de build sur ces fichiers. |

---

## 7. Autres erreurs TypeScript connues (hors build actuel)

Lors de précédents `tsc --noEmit` / builds, d’autres erreurs ont pu apparaître dans :

- `app/api/certificates/[id]/route.ts` (comparaison de status avec `REVOKED`)
- `app/api/certificates/[id]/status/route.ts` (idem)
- `app/api/qr/[id]/route.ts` (signature QRCode / buffer)
- `app/api/stripe/create-checkout/route.ts` (déjà corrigé : plus de `billingPeriod`)
- `app/api/stripe/portal/route.ts` (include `subscription` sur User)
- `lib/checkQuota.ts`, `app/dashboard/subscription/page.tsx` (include `subscription`)
- `app/dashboard/create/page.tsx` (ZodError `.errors`)
- `lib/stripe.ts` (version API Stripe)

**À vérifier** : après correction de `admin/alerts`, relancer `npm run build` et traiter les éventuelles erreurs restantes.

---

## 8. Variables d’environnement — récap

À avoir en local (`.env.local`) et sur Vercel pour un déploiement complet :

- **Auth** : `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **DB** : `DATABASE_URL`, `DIRECT_URL`
- **JWT** : `BLOCKTRUST_JWT_PRIVATE_KEY`, `BLOCKTRUST_JWT_PUBLIC_KEY` (PEM avec `\n` dans la valeur)
- **Stripe** : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ESSENTIEL`, `STRIPE_PRICE_PREMIUM`, `STRIPE_PRICE_FAMILLE`, `STRIPE_PRICE_FAMILLE_PLUS`
- **Optionnel** : `RESEND_API_KEY` (emails), `NEXT_PUBLIC_APP_URL` (liens dans les emails / redirects)

Référence détaillée : `ENV_CHECKLIST.md`, `STRIPE_SETUP.md`.

---

## 9. Résumé pour Claude

- **Un seul blocage de build** : `app/admin/alerts/page.tsx` utilise un `include` sur `prisma.aIAlert` alors que le modèle **AIAlert** n’a pas de relations `entity` / `certificate` dans le schema. Il faut soit ajouter ces relations dans `prisma/schema.prisma`, soit supprimer cet `include` et gérer entity/certificate autrement.
- **Tout le reste décrit ci-dessus** (auth, session.plan, Stripe checkout + webhook, pricing, emails, dashboard, API core) est **implémenté et considéré opérationnel** sous réserve que les env soient configurées.
- **Pas de plan gratuit** : le moins cher est Essentiel 3,99 €/mois ; la page Pricing est alignée avec ça.
- **Port dev** : `3004` (`npm run dev`).

Ce document peut être partagé tel quel à Claude pour continuer le travail (correction du build admin/alerts, puis vérifications ciblées si besoin).
